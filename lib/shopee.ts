import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential } from "@/lib/vault";

export interface ShopeeOAuthCredentials {
  access_token: string;
  refresh_token: string;
  shop_id: string;
}

interface ShopeeOrder {
  order_sn: string;
  order_status?: string;
  create_time?: number;
  update_time?: number;
  order_total?: number;
  buyer_user_id?: number;
  buyer_username?: string;
  order_items?: ShopeeOrderItem[];
}

interface ShopeeOrderItem {
  item_name?: string;
  model_name?: string;
  quantity?: number;
  model_original_price?: number;
}

function shopeeApiCredentials() {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  if (!partnerId || !partnerKey) {
    throw new Error("SHOPEE_PARTNER_ID/SHOPEE_PARTNER_KEY não configurados no ambiente");
  }
  return { partnerId, partnerKey };
}

/**
 * Carrega as credenciais do Shopee do Vault.
 */
async function loadShopeeCredentials(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<ShopeeOAuthCredentials> {
  if (!integration.credential_secret_id) throw new Error("Integração Shopee sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial Shopee não encontrada no Vault");
  return JSON.parse(raw) as ShopeeOAuthCredentials;
}

/**
 * Busca detalhes de um pedido na Shopee usando a API v2.
 * Requer HMAC-SHA256 assinado com partner_key.
 */
async function fetchShopeeOrderRaw(
  accessToken: string,
  shopId: string,
  orderSn: string,
  partnerId: string,
  partnerKey: string
) {
  const path = "/api/v2/order/get_order_detail";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");

  const url = new URL(`https://partner.shopeemobile.com${path}`);
  url.searchParams.set("partner_id", partnerId);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("sign", sign);
  url.searchParams.set("shop_id", shopId);
  url.searchParams.set("order_sn", orderSn);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return { res, order: null };
  }

  const data = await res.json();
  // Shopee envolve em { response: {...} }
  const order = (data.response || data) as ShopeeOrder;
  return { res, order };
}

export async function fetchShopeeOrderForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderSn: string
): Promise<ShopeeOrder> {
  const creds = await loadShopeeCredentials(admin, integration);
  const { partnerId, partnerKey } = shopeeApiCredentials();

  const { res, order } = await fetchShopeeOrderRaw(
    creds.access_token,
    creds.shop_id,
    orderSn,
    partnerId,
    partnerKey
  );

  if (!res.ok || !order) {
    throw new Error(`Shopee respondeu ${res.status} ao buscar o pedido ${orderSn}`);
  }

  return order;
}

/**
 * Mapeia status do Shopee pra status do StudioMaker.
 * Referência: https://open.shopee.com/documents?version=3&doc_id=65d9e4b7d4b7100000d17c0a
 */
function mapShopeeOrderStatus(status?: string): "paid" | "cancelled" | null {
  if (!status) return null;

  // Shopee status: 100 (not confirmed), 101 (confirmed), 102 (processed), 103 (shipped),
  // 104 (delivered), 105 (completed), 201 (cancelled), 202 (request cancel), etc.
  const statusCode = Number(status);
  if (statusCode === 101 || statusCode === 102) return "paid"; // confirmed ou processed
  if (statusCode === 201 || statusCode === 202) return "cancelled"; // cancelled ou request_cancel
  // Outros status (100, 103, 104, 105) = ainda em progresso
  return null;
}

/**
 * Cria/atualiza a venda a partir de um pedido do Shopee.
 * Idempotente via unique index (user_id, source, external_order_id).
 */
export async function upsertQuoteFromShopeeOrder(admin: SupabaseClient, userId: string, order: ShopeeOrder) {
  const status = mapShopeeOrderStatus(String(order.order_status));
  if (!status) return null;

  const firstItem = order.order_items?.[0];
  const grossAmount = Number(order.order_total ?? firstItem?.model_original_price ?? 0);
  const platformFee = 0; // Shopee não retorna marketplace fee no get_order_detail - será adicionado se disponível

  const buyerName = order.buyer_username || null;
  const productName = firstItem?.item_name || firstItem?.model_name || "Venda Shopee";

  const { data, error } = await admin
    .from("quotes")
    .upsert(
      {
        user_id: userId,
        project_name: productName,
        final_price: grossAmount,
        platform_fee: platformFee,
        cost_amount: 0,
        status,
        source: "shopee",
        external_order_id: order.order_sn,
        buyer_name: buyerName,
        sent_at: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
        client_id: null,
        product_id: null,
        weight_g: 0,
        print_time_min: 0,
        energy_cost: 0,
        filament_cost: 0,
        margin_percent: 0,
      },
      { onConflict: "user_id,source,external_order_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Shopee.
 * Formato: Authorization: hmac_sha256=${signature}
 */
export function validateShopeeWebhookSignature(params: {
  authHeader: string | null;
  rawBody: string;
  partnerKey: string;
}): boolean {
  if (!params.authHeader) return false;

  const url = ""; // Shopee assina só o body, não URL
  const expected = crypto
    .createHmac("sha256", params.partnerKey)
    .update(`${url}|${params.rawBody}`)
    .digest("hex");

  // Header vem como "hmac_sha256=${signature}"
  const signature = params.authHeader.replace("hmac_sha256=", "").trim();
  return signature === expected;
}
