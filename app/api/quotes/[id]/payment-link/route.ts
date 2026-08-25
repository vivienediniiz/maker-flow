import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createMercadoPagoPreferenceForIntegration } from "@/lib/mercadoPago";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Gera (ou devolve a já existente) uma URL de Checkout Pro pra uma venda já
 * criada — na conta Mercado Pago do próprio maker (mesma integração usada
 * pela Loja Online). Ao gerar, a venda volta pro status "sent" (aguardando
 * pagamento); o webhook /api/webhooks/mercado-pago confirma sozinho quando o
 * cliente pagar (external_reference = id desta quote), avançando pra "paid".
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: quote } = await admin
    .from("quotes")
    .select("id, user_id, project_name, final_price, status, payment_link_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  if (quote.status === "paid" || quote.status === "cancelled") {
    return NextResponse.json(
      { error: quote.status === "paid" ? "Essa venda já está paga." : "Essa venda está cancelada." },
      { status: 400 }
    );
  }

  // Já tem link gerado pra essa venda — reaproveita em vez de criar outra
  // preferência (evita links divergentes apontando pro mesmo pedido).
  if (quote.payment_link_url) {
    return NextResponse.json({ url: quote.payment_link_url });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, credential_secret_id, status")
    .eq("user_id", user.id)
    .eq("platform", "mercado_pago")
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return NextResponse.json(
      { error: "Conecte o Mercado Pago em Integrações antes de gerar um link de cobrança." },
      { status: 400 }
    );
  }

  try {
    const preference = await createMercadoPagoPreferenceForIntegration(admin, integration, {
      items: [
        {
          title: quote.project_name || "Venda StudioMaker",
          quantity: 1,
          unit_price: quote.final_price,
          currency_id: "BRL",
        },
      ],
      external_reference: quote.id,
      notification_url: `${SITE_URL}/api/webhooks/mercado-pago`,
    });

    await admin
      .from("quotes")
      .update({
        payment_link_url: preference.init_point,
        mp_preference_id: preference.id,
        status: "sent",
      })
      .eq("id", quote.id);

    return NextResponse.json({ url: preference.init_point });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
