import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  disconnectShopeeIntegration,
  fetchShopeeOrderForIntegration,
  findShopeeIntegrationByShopId,
  getShopeeConfig,
  mapShopeeOrderStatus,
  upsertQuoteFromShopeeOrder,
  validateShopeePushSignature,
} from "@/lib/shopee";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Códigos de push confirmados em open.shopee.com/push-mechanism:
//  2 = shop_authorization_canceled_push, 3 = order_status_push.
const SHOP_AUTHORIZATION_CANCELED = 2;
const ORDER_STATUS_PUSH = 3;

const ok = () => NextResponse.json({ ok: true });

/** shop_id pode vir na raiz, em data.shop_id ou em data.shop_id_list (cancelamento via conta principal). */
function collectShopIds(payload: any): string[] {
  const ids = new Set<string>();
  const add = (v: unknown) => v != null && v !== "" && ids.add(String(v));
  add(payload?.shop_id);
  const data = Array.isArray(payload?.data) ? payload.data : [payload?.data];
  for (const d of data) {
    add(d?.shop_id);
    (Array.isArray(d?.shop_id_list) ? d.shop_id_list : []).forEach(add);
  }
  return [...ids];
}

/**
 * Push da Shopee. Regras da doc: responder 200 em até 3s; entrega repetível
 * (retries em 300s/1800s/10800s) — o upsert por order_sn já é idempotente.
 * A assinatura (header Authorization) é HMAC-SHA256(partner_key, URL + "|" +
 * corpo cru). Só mensagens que realmente processamos exigem assinatura
 * válida: o ping de verificação da URL no Console e códigos que ignoramos
 * recebem 200 sem fazer nada.
 */
export async function POST(req: NextRequest) {
  const cfg = getShopeeConfig();
  const rawBody = await req.text();
  if (!cfg) return ok();

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return ok();
  }

  const code = Number(payload?.code);
  if (code !== ORDER_STATUS_PUSH && code !== SHOP_AUTHORIZATION_CANCELED) return ok();

  // A URL assinada é a cadastrada no Console. SHOPEE_PUSH_URL força um valor
  // exato se o proxy mudar o host/esquema que o Next enxerga.
  const url = process.env.SHOPEE_PUSH_URL || `${req.nextUrl.origin}${req.nextUrl.pathname}`;
  if (!validateShopeePushSignature({ url, rawBody, authHeader: req.headers.get("authorization"), partnerKey: cfg.pushPartnerKey })) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = adminClient();

  try {
    if (code === SHOP_AUTHORIZATION_CANCELED) {
      for (const shopId of collectShopIds(payload)) {
        const integration = await findShopeeIntegrationByShopId(admin, shopId);
        if (integration) await disconnectShopeeIntegration(admin, integration);
      }
      return ok();
    }

    const shopId = payload?.shop_id;
    const orderSn = payload?.data?.ordersn;
    // Status que não viram venda (ex.: UNPAID) nem chegam a gastar chamada de API.
    if (!shopId || !orderSn || !mapShopeeOrderStatus(payload?.data?.status)) return ok();

    const integration = await findShopeeIntegrationByShopId(admin, shopId);
    if (!integration) {
      console.warn("[webhook] shopee: nenhuma integração com esse shop_id", { shopId });
      return ok();
    }

    const order = await fetchShopeeOrderForIntegration(admin, integration, String(orderSn));
    await upsertQuoteFromShopeeOrder(admin, integration.user_id, order);
    await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);
  } catch (error) {
    // 200 mesmo assim: erro nosso não vira fila de retries; o próximo push do pedido tenta de novo.
    console.error("[webhook] shopee erro ao processar", { error, code });
  }

  return ok();
}
