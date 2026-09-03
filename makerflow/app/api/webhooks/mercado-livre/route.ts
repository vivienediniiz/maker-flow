import { webhookRateLimit, requestIp } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchMercadoLivreOrderForIntegration, upsertQuoteFromMercadoLivreOrder } from "@/lib/mercadoLivre";
import { apiError } from "@/lib/apiError";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook de VENDAS do Mercado Livre — URL única pra aplicação inteira,
 * cadastrada uma vez nas notificações do app no DevCenter do Mercado Livre
 * (tópico "orders_v2"). O payload só traz `resource` (ex: "/orders/123") e
 * `user_id` (a conta ML de quem recebeu o pedido) — não confiamos em mais
 * nada do corpo, sempre reconsultamos a API do ML com o access_token salvo
 * (mesma defesa usada no webhook do Mercado Pago).
 */
export async function POST(req: NextRequest) {
  if (webhookRateLimit) {
    const ip = requestIp(req);
    const { success } = await webhookRateLimit.limit(ip);
    if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const admin = adminClient();

  const body = await req.json().catch(() => ({}));
  const topic = body.topic as string | undefined;
  const resource = body.resource as string | undefined;
  const mlUserId = body.user_id;

  if (topic !== "orders_v2" || !resource) {
    return NextResponse.json({ ok: true, skipped: "not an order notification" });
  }

  const orderId = resource.split("/").pop();
  if (!mlUserId || !orderId) {
    console.log("[webhook] mercado-livre: payload incompleto, ignorado", JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: true, skipped: "incomplete payload" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id")
    .eq("platform", "mercado_livre")
    .eq("platform_account_id", String(mlUserId))
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    console.log(`[webhook] mercado-livre: nenhuma integração conectada pro user_id ${mlUserId}`);
    return NextResponse.json({ ok: true, skipped: "no connected integration for this account" });
  }

  try {
    const order = await fetchMercadoLivreOrderForIntegration(admin, integration, orderId);
    await upsertQuoteFromMercadoLivreOrder(admin, integration.user_id, order);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return apiError("webhook:mercado-livre", err, "Falha ao processar notificação.", 500);
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
