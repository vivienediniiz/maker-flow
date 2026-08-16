import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchMercadoPagoPaymentForIntegration, upsertQuoteFromMercadoPagoPayment, validateMercadoPagoSignature } from "@/lib/mercadoPago";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook de VENDAS do maker, modelo OAuth/aplicação única: uma única URL,
 * cadastrada UMA VEZ nas notificações da aplicação do MakerFlow no painel do
 * Mercado Pago (não por maker). O payload de todo pagamento traz `user_id`
 * (a conta MP de quem recebeu o pagamento) — usamos isso pra achar qual
 * integração/maker é dona do evento. Documentado pela própria Mercado Pago
 * como o jeito de uma aplicação distinguir vendedores conectados via OAuth.
 *
 * Diferente de /api/webhooks/mercadopago (assinatura do MakerFlow) e de
 * /api/webhooks/mercado-pago/[integrationId] (URL por-maker, do fluxo antigo
 * de Access Token manual — mantida funcionando, mas não é mais usada por
 * nenhuma tela desde que a conexão virou OAuth automático).
 */
export async function POST(req: NextRequest) {
  const admin = adminClient();

  const body = await req.json().catch(() => ({}));
  const topic = body.type ?? req.nextUrl.searchParams.get("topic");
  const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("id") ?? req.nextUrl.searchParams.get("data.id");
  const mpUserId = body.user_id ?? body.data?.user_id;

  if (topic !== "payment" || !resourceId) {
    return NextResponse.json({ ok: true, skipped: "not a payment event" });
  }

  if (!mpUserId) {
    return NextResponse.json({ ok: true, skipped: "no user_id in payload" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id, webhook_secret")
    .eq("platform", "mercado_pago")
    .eq("platform_account_id", String(mpUserId))
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return NextResponse.json({ ok: true, skipped: "no connected integration for this account" });
  }

  if (integration.webhook_secret) {
    const validSignature = validateMercadoPagoSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: String(resourceId),
      secret: integration.webhook_secret,
    });
    if (!validSignature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  try {
    const payment = await fetchMercadoPagoPaymentForIntegration(admin, integration, String(resourceId));
    await upsertQuoteFromMercadoPagoPayment(admin, integration.user_id, payment);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
