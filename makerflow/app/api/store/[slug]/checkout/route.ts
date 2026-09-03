import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createMercadoPagoPreferenceForIntegration } from "@/lib/mercadoPago";
import { createInfinitePayCheckoutLink, InfinitePayError } from "@/lib/infinitePay";
import { checkoutRateLimit, requestIp } from "@/lib/rateLimit";
import { apiError } from "@/lib/apiError";
import type { StoreProfilePublic } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";
// Único vendedor autorizado a usar InfinitePay — handle não é secreto (a
// própria InfinitePay trata como público), mas o botão só aparece/funciona
// pra essa loja específica, pra não desviar pagamento de outro vendedor pra
// essa conta (a Loja Online é multi-tenant, InfinitePay hoje não é).
const INFINITEPAY_STORE_SLUG = process.env.NEXT_PUBLIC_INFINITEPAY_STORE_SLUG;
const INFINITEPAY_HANDLE = process.env.INFINITEPAY_HANDLE;

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Bloqueia < e > em todo campo de texto livre digitado pelo comprador —
// esses campos viram clients.name/address e, mais adiante, aparecem em
// telas do LOJISTA (comprovante de venda, documento de envio) que montam
// HTML por string (container.innerHTML). Sem isso, um "nome" tipo
// "<img src=x onerror=...>" executa no navegador de quem vender.
const noHtmlText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^<>]*$/, "Não use os caracteres < ou >");

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        customization: noHtmlText(500).optional(),
      })
    )
    .min(1),
  paymentMethod: z.enum(["mercado_pago", "infinitepay"]).optional(),
  buyer: z.object({
    name: noHtmlText(120).min(1, "Nome é obrigatório"),
    email: z.string().trim().email().max(200),
    phone: noHtmlText(30).optional(),
    cep: noHtmlText(9).optional(),
    street: noHtmlText(200).optional(),
    number: noHtmlText(20).optional(),
    complement: noHtmlText(100).optional(),
    neighborhood: noHtmlText(100).optional(),
    city: noHtmlText(100).optional(),
    state: noHtmlText(2).optional(),
  }),
});

/**
 * Checkout público da Loja Online — sem autenticação. Recalcula preços a
 * partir do banco (nunca confia no que o navegador manda), cria o snapshot
 * em `store_checkouts` e abre uma preferência de Checkout Pro na conta MP do
 * próprio vendedor. A confirmação de pagamento chega depois pelo webhook já
 * existente (`/api/webhooks/mercado-pago`), que lê `external_reference` de
 * volta pra achar esse checkout.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;

  // Rota pública (sem login) que cria cobrança de verdade no Mercado
  // Pago/InfinitePay — precisa de limite por IP pra não virar alvo de spam.
  // Se o Upstash falhar/estiver mal configurado, deixa passar (loga o erro)
  // em vez de derrubar o checkout inteiro — o rate limit nunca pode ser o
  // motivo de uma venda real falhar.
  if (checkoutRateLimit) {
    try {
      const { success } = await checkoutRateLimit.limit(requestIp(req));
      if (!success) {
        return NextResponse.json({ error: "Muitas tentativas — aguarde um instante e tente de novo." }, { status: 429 });
      }
    } catch (err) {
      console.error("[checkout] falha ao consultar rate limit — deixando passar", (err as Error).message);
    }
  } else {
    console.warn("[checkout] rate limit desativado — configure UPSTASH_REDIS_REST_URL/TOKEN.");
  }

  const admin = adminClient();

  const rawBody = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do pedido inválidos." }, { status: 400 });
  }
  const { items, buyer, paymentMethod: paymentMethodInput } = parsed.data;
  const paymentMethod: "mercado_pago" | "infinitepay" = paymentMethodInput === "infinitepay" ? "infinitepay" : "mercado_pago";

  if (paymentMethod === "infinitepay" && (!INFINITEPAY_HANDLE || slug !== INFINITEPAY_STORE_SLUG)) {
    return NextResponse.json({ error: "InfinitePay não está disponível pra essa loja." }, { status: 400 });
  }

  const { data: seller } = await admin
    .from("store_profiles_public")
    .select("*")
    .eq("store_slug", slug)
    .maybeSingle();

  const sellerProfile = seller as StoreProfilePublic | null;
  if (!sellerProfile || !sellerProfile.store_enabled || !sellerProfile.payment_ready) {
    return NextResponse.json({ error: "Loja indisponível no momento." }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const { data: products } = await admin
    .from("products")
    .select("id, name, sale_price, allows_customization")
    .eq("user_id", sellerProfile.user_id)
    .eq("in_store", true)
    .in("id", productIds);

  const productsById = new Map((products ?? []).map((p) => [p.id, p]));

  const checkoutItems = items
    .map((item) => {
      const product = productsById.get(item.productId);
      const quantity = Math.max(1, Math.floor(item.quantity) || 1);
      if (!product) return null;
      // Nunca confia no texto vindo do cliente sozinho — só persiste
      // personalização se o produto de fato permite (evita que o campo seja
      // usado como texto livre arbitrário em produto sem essa opção).
      const customization = product.allows_customization && item.customization?.trim() ? item.customization.trim().slice(0, 500) : null;
      return {
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        quantity,
        ...(customization ? { customization } : {}),
      };
    })
    .filter(
      (i): i is { product_id: string; name: string; unit_price: number; quantity: number; customization?: string } => i !== null
    );

  if (checkoutItems.length === 0) {
    return NextResponse.json({ error: "Nenhum produto do carrinho está disponível." }, { status: 400 });
  }

  const totalAmount = checkoutItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const { data: checkout, error: checkoutError } = await admin
    .from("store_checkouts")
    .insert({
      seller_user_id: sellerProfile.user_id,
      status: "pending",
      payment_provider: paymentMethod,
      buyer_name: buyer.name.trim(),
      buyer_email: buyer.email.trim(),
      buyer_phone: buyer.phone || null,
      buyer_cep: buyer.cep || null,
      buyer_street: buyer.street || null,
      buyer_number: buyer.number || null,
      buyer_complement: buyer.complement || null,
      buyer_neighborhood: buyer.neighborhood || null,
      buyer_city: buyer.city || null,
      buyer_state: buyer.state || null,
      items: checkoutItems,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (checkoutError || !checkout) {
    return NextResponse.json({ error: checkoutError?.message ?? "Falha ao iniciar o checkout." }, { status: 500 });
  }

  if (paymentMethod === "infinitepay") {
    try {
      const link = await createInfinitePayCheckoutLink({
        handle: INFINITEPAY_HANDLE!,
        items: checkoutItems.map((i) => ({
          quantity: i.quantity,
          price: Math.round(i.unit_price * 100),
          description: i.name,
        })),
        order_nsu: checkout.id,
        redirect_url: `${SITE_URL}/loja/${slug}?pedido=sucesso&checkout_id=${checkout.id}`,
        webhook_url: `${SITE_URL}/api/webhooks/infinitepay`,
        customer: { name: buyer.name.trim(), email: buyer.email.trim(), phone_number: buyer.phone || undefined },
      });

      await admin.from("store_checkouts").update({ infinitepay_order_nsu: checkout.id }).eq("id", checkout.id);

      return NextResponse.json({ init_point: link.url });
    } catch (err) {
      // 4xx = o InfinitePay recusou os dados da cobrança (valor abaixo do
      // mínimo, por exemplo). Quem compra não tem como corrigir isso, então
      // "tente novamente" só empurra pro mesmo erro — manda pro Mercado Pago,
      // que é a outra forma de pagamento da mesma loja.
      if (err instanceof InfinitePayError && err.isRejected) {
        return apiError(
          "checkout:infinitepay",
          err,
          "Não foi possível pagar com InfinitePay agora. Escolha Mercado Pago pra finalizar o pedido.",
          400
        );
      }
      return apiError("checkout:infinitepay", err, "Não foi possível iniciar o pagamento. Tente novamente.");
    }
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", sellerProfile.user_id)
    .eq("platform", "mercado_pago")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration || !integration.credential_secret_id) {
    return NextResponse.json({ error: "Loja sem pagamento configurado no momento." }, { status: 400 });
  }

  try {
    const preference = await createMercadoPagoPreferenceForIntegration(admin, integration, {
      items: checkoutItems.map((i) => ({
        title: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: "BRL",
      })),
      payer: { name: buyer.name.trim(), email: buyer.email.trim() },
      external_reference: checkout.id,
      notification_url: `${SITE_URL}/api/webhooks/mercado-pago`,
      back_urls: {
        success: `${SITE_URL}/loja/${slug}?pedido=sucesso&checkout_id=${checkout.id}`,
        failure: `${SITE_URL}/loja/${slug}?pedido=falha&checkout_id=${checkout.id}`,
        pending: `${SITE_URL}/loja/${slug}?pedido=pendente&checkout_id=${checkout.id}`,
      },
      auto_return: "approved",
    });

    await admin.from("store_checkouts").update({ mp_preference_id: preference.id }).eq("id", checkout.id);

    return NextResponse.json({ init_point: preference.init_point });
  } catch (err) {
    return apiError("checkout:mercado-pago", err, "Não foi possível iniciar o pagamento. Tente novamente.");
  }
}
