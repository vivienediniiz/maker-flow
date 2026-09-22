import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  fetchTikTokShopOrderForIntegration,
  upsertQuoteFromTikTokShopOrder,
  validateTikTokShopWebhookSignature,
} from "@/lib/tiktokShop";
import { getIntegrationCredential } from "@/lib/vault";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// type=1 = "Order status change" (confirmado na doc de webhooks) — outros
// tipos (produto, devolução, etc.) não são relevantes pro fluxo de Vendas.
const ORDER_STATUS_CHANGE_TYPE = 1;

/**
 * Webhook do TikTok Shop — recebe eventos de pedido.
 * Confirmado contra a doc oficial (partner.tiktokshop.com):
 *  - Assinatura vem no header `Authorization` (não Bearer), HMAC-SHA256 de
 *    `{app_key}{raw_body}` usando app_secret como chave, hex minúsculo —
 *    algoritmo DIFERENTE do usado pra assinar chamadas de API (lib/tiktokShop.ts).
 *  - Payload: { type, tts_notification_id, shop_id, timestamp, data: {...} }.
 *  - Deve responder 200 (vazio) em até 3s pra aceitar, 401 (vazio) se a
 *    assinatura for inválida — qualquer outra coisa gera retry (2min, 30min,
 *    3h, 12h, depois desiste). Delivery é at-least-once: reprocessar o mesmo
 *    evento é seguro aqui porque o upsert de quote já é idempotente via
 *    external_order_id, sem precisar de tabela de dedupe separada.
 */
export async function POST(req: NextRequest) {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  const rawBody = await req.text();

  if (appKey && appSecret) {
    const authHeader = req.headers.get("authorization");
    if (!validateTikTokShopWebhookSignature({ authHeader, rawBody, appKey, appSecret })) {
      return new NextResponse(null, { status: 401 });
    }
  } else {
    // App ainda não configurado — responde 200 pro ping de verificação do
    // TikTok Shop ao cadastrar a URL, sem processar nada de verdade.
    return new NextResponse(null, { status: 200 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { type, shop_id: shopId, data } = payload ?? {};
  const orderId = data?.order_id;

  if (type !== ORDER_STATUS_CHANGE_TYPE || !shopId || !orderId) {
    // Outros tipos de evento (produto, devolução, etc.) ou payload
    // incompleto — reconhece a entrega sem processar.
    return new NextResponse(null, { status: 200 });
  }

  const admin = adminClient();

  try {
    const { data: integrations } = await admin
      .from("integrations")
      .select("id, credential_secret_id, user_id")
      .eq("platform", "tiktok_shop")
      .eq("status", "connected");

    if (!integrations || integrations.length === 0) {
      return new NextResponse(null, { status: 200 });
    }

    // Acha a integração pelo shop_id salvo nas credenciais (URL de webhook é
    // única pra aplicação inteira, roteada pelo shop_id do payload — mesmo
    // padrão do webhook do Mercado Pago).
    let targetIntegration: { id: string; credential_secret_id: string | null; user_id: string } | null = null;
    for (const integration of integrations) {
      if (!integration.credential_secret_id) continue;
      try {
        const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
        if (raw && JSON.parse(raw).shop_id === String(shopId)) {
          targetIntegration = integration;
          break;
        }
      } catch {
        // Credencial corrompida/ilegível — pula pra próxima.
      }
    }

    if (!targetIntegration) {
      console.warn("[webhook] tiktok-shop no matching shop_id found", { shopId });
      return new NextResponse(null, { status: 200 });
    }

    const order = await fetchTikTokShopOrderForIntegration(admin, targetIntegration, String(orderId));
    await upsertQuoteFromTikTokShopOrder(admin, targetIntegration.user_id, order);

    await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", targetIntegration.id);
  } catch (error) {
    console.error("[webhook] tiktok-shop error processing", { error, shopId, orderId });
    // Ainda responde 200 — erro nosso não deve virar retry infinito da
    // plataforma; próximo evento de status desse mesmo pedido tenta de novo.
  }

  return new NextResponse(null, { status: 200 });
}
