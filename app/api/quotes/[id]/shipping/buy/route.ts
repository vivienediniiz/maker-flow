import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  addToMelhorEnvioCart,
  checkoutMelhorEnvioCart,
  fetchMelhorEnvioBalance,
  buildShippingParties,
} from "@/lib/melhorEnvio";
import { loadShippingContext, generateAndFetchLabel } from "@/lib/shippingLabel";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Compra de frete de verdade — só chamada a partir de um clique explícito
 * de confirmação no painel (nunca automática). Cada etapa grava o status
 * antes de tentar a próxima, então uma falha no meio nunca deixa a venda
 * num estado ambíguo: dá pra ver exatamente onde parou e retomar dali.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { serviceId, price, carrierName, serviceName, weightG, heightCm, widthCm, lengthCm } = body;

  if (!serviceId || !price || !weightG || !heightCm || !widthCm || !lengthCm) {
    return NextResponse.json({ error: "Dados da compra incompletos." }, { status: 400 });
  }

  const admin = adminClient();
  const ctx = await loadShippingContext(admin, user.id, params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 400 });
  }
  const { quote, client, profile, integration } = ctx;

  if (quote.shipping_label_status === "comprado" || quote.shipping_label_status === "gerado" || quote.shipping_label_status === "impresso") {
    return NextResponse.json({ error: "Essa venda já tem frete comprado." }, { status: 400 });
  }

  const parties = buildShippingParties(profile, client);
  if ("missing" in parties) {
    return NextResponse.json({ error: "Endereço incompleto pra gerar etiqueta.", missing: parties.missing }, { status: 400 });
  }

  // Revalida saldo contra o preço mostrado na confirmação — nunca confia só
  // no que o client mandou de volta.
  let balance: number;
  try {
    balance = await fetchMelhorEnvioBalance(admin, integration);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  if (balance < Number(price)) {
    return NextResponse.json(
      { error: `Saldo insuficiente na carteira Melhor Envio — saldo atual R$ ${balance.toFixed(2)}, frete custa R$ ${Number(price).toFixed(2)}.` },
      { status: 400 }
    );
  }

  // Retomada: se já tem item no carrinho de uma tentativa anterior que
  // parou em "no_carrinho" (checkout falhou), reaproveita em vez de
  // adicionar de novo (evitaria pagar duas vezes o mesmo frete).
  let orderId = quote.shipping_label_status === "no_carrinho" ? quote.shipping_service_id : null;

  if (!orderId) {
    try {
      const cartItem = await addToMelhorEnvioCart(admin, integration, {
        serviceId: Number(serviceId),
        from: parties.from,
        to: parties.to,
        productName: quote.project_name || "Produto",
        productValue: quote.final_price,
        weightKg: Number(weightG) / 1000,
        heightCm: Number(heightCm),
        widthCm: Number(widthCm),
        lengthCm: Number(lengthCm),
      });
      orderId = cartItem.id;

      await admin
        .from("quotes")
        .update({
          shipping_service_id: cartItem.id,
          shipping_label_status: "no_carrinho",
          shipping_carrier_name: carrierName ?? null,
          shipping_service_name: serviceName ?? null,
        })
        .eq("id", quote.id);
    } catch (err) {
      return NextResponse.json({ error: `Falha ao adicionar ao carrinho: ${(err as Error).message}` }, { status: 502 });
    }
  }

  try {
    await checkoutMelhorEnvioCart(admin, integration, orderId);
  } catch (err) {
    // Fica em "no_carrinho" — dinheiro ainda não saiu, próxima tentativa
    // retoma do checkout sem adicionar ao carrinho de novo.
    return NextResponse.json(
      { error: `Compra ficou no carrinho, mas o checkout falhou: ${(err as Error).message} — tente de novo.` },
      { status: 502 }
    );
  }

  const purchasedAt = new Date().toISOString();
  await admin
    .from("quotes")
    .update({
      shipping_label_status: "comprado",
      shipping_purchased_cost: Number(price),
      shipping_purchased_at: purchasedAt,
    })
    .eq("id", quote.id);

  // Gerar não custa nada além do que já foi pago — encadeia automaticamente,
  // mas sem esconder uma falha aqui: se der errado, a venda fica visivelmente
  // "comprado" (dinheiro gasto, etiqueta ainda não) e o botão "Gerar
  // Etiqueta" continua disponível pra tentar de novo.
  try {
    const result = await generateAndFetchLabel(admin, integration, orderId);
    await admin
      .from("quotes")
      .update({
        shipping_label_status: "gerado",
        shipping_generated_at: result.generatedAt,
        shipping_label_url: result.labelUrl,
        ...(result.trackingCode ? { shipping_tracking_code: result.trackingCode } : {}),
      })
      .eq("id", quote.id);

    return NextResponse.json({
      shipping_label_status: "gerado",
      shipping_service_id: orderId,
      shipping_carrier_name: carrierName ?? null,
      shipping_service_name: serviceName ?? null,
      shipping_purchased_cost: Number(price),
      shipping_purchased_at: purchasedAt,
      shipping_generated_at: result.generatedAt,
      shipping_label_url: result.labelUrl,
      shipping_tracking_code: result.trackingCode,
    });
  } catch (err) {
    return NextResponse.json({
      shipping_label_status: "comprado",
      shipping_service_id: orderId,
      shipping_carrier_name: carrierName ?? null,
      shipping_service_name: serviceName ?? null,
      shipping_purchased_cost: Number(price),
      shipping_purchased_at: purchasedAt,
      generateError: `Frete comprado, mas falhou ao gerar a etiqueta automaticamente: ${(err as Error).message} — use o botão "Gerar Etiqueta".`,
    });
  }
}
