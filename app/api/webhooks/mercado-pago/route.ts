import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchMercadoPagoOrderForIntegration, upsertQuoteFromMercadoPagoOrder, validateMercadoPagoSignature } from "@/lib/mercadoPago";
import { apiError } from "@/lib/apiError";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook de VENDAS do maker, app "MakerFlow Vendas" (Orders API) — URL
 * ÚNICA pra aplicação inteira, cadastrada uma vez nas notificações desse
 * app no painel do Mercado Pago (não por maker). O payload de todo evento
 * de pedido traz `user_id` (a conta MP de quem recebeu o pedido) — usamos
 * isso pra achar qual integração/maker é dona do evento, guardado em
 * integrations.platform_account_id no momento da conexão via OAuth.
 *
 * Diferente de /api/webhooks/mercadopago, que é o webhook da assinatura do
 * StudioMaker (app "Makerflow3d", não mexer nesse).
 */
export async function POST(req: NextRequest) {
  const admin = adminClient();

  const body = await req.json().catch(() => ({}));
  const type = body.type ?? req.nextUrl.searchParams.get("type");
  const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("data.id");
  const mpUserId = body.user_id;

  if (type !== "order" || !resourceId) {
    return NextResponse.json({ ok: true, skipped: "not an order event" });
  }

  if (!mpUserId) {
    console.log("[webhook] mercado-pago: evento sem user_id no payload, ignorado");
    return NextResponse.json({ ok: true, skipped: "no user_id in payload" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id")
    .eq("platform", "mercado_pago")
    .eq("platform_account_id", String(mpUserId))
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    // Nenhum cliente do StudioMaker corresponde a esse user_id - ignora
    // silenciosamente (só loga), não retorna erro pro Mercado Pago.
    console.log(`[webhook] mercado-pago: nenhuma integração conectada pro user_id ${mpUserId}`);
    return NextResponse.json({ ok: true, skipped: "no connected integration for this account" });
  }

  const webhookSecret = process.env.MERCADO_PAGO_VENDAS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const validSignature = validateMercadoPagoSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: String(resourceId),
      secret: webhookSecret,
    });
    if (!validSignature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  try {
    const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));
    await upsertQuoteFromMercadoPagoOrder(admin, integration.user_id, order);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return apiError("webhook:mercado-pago", err, "Falha ao processar notificação.", 500);
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
