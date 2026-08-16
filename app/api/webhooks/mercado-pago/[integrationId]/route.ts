import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getIntegrationCredential } from "@/lib/vault";
import { fetchMercadoPagoPayment, upsertQuoteFromMercadoPagoPayment, validateMercadoPagoSignature } from "@/lib/mercadoPago";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook de VENDAS do maker (conta Mercado Pago dele, conectada em
 * Integrações) — diferente de /api/webhooks/mercadopago, que é o da
 * assinatura do MakerFlow. `integrationId` na URL identifica de qual maker
 * é o evento, pra sabermos qual Access Token usar pra reconsultar o
 * pagamento (nunca confiamos no corpo do POST sozinho).
 */
export async function POST(req: NextRequest, { params }: { params: { integrationId: string } }) {
  const { integrationId } = params;

  const admin = adminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id, webhook_secret")
    .eq("id", integrationId)
    .eq("platform", "mercado_pago")
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    // Responde 200 mesmo assim - devolver erro faz o MP ficar retentando
    // pra sempre uma integração que foi desconectada.
    return NextResponse.json({ ok: true, skipped: "integration not connected" });
  }

  const body = await req.json().catch(() => ({}));
  const topic = body.type ?? req.nextUrl.searchParams.get("topic");
  const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("id") ?? req.nextUrl.searchParams.get("data.id");

  if (topic !== "payment" || !resourceId) {
    return NextResponse.json({ ok: true, skipped: "not a payment event" });
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

  let accessToken: string | null;
  try {
    accessToken = await getIntegrationCredential(admin, integration.credential_secret_id);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (!accessToken) {
    return NextResponse.json({ ok: true, skipped: "no credential" });
  }

  try {
    const payment = await fetchMercadoPagoPayment(accessToken, String(resourceId));
    await upsertQuoteFromMercadoPagoPayment(admin, integration.user_id, payment);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
