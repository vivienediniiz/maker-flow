import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteIntegrationCredential, getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";

/**
 * Integração Shopee Open Platform (API v2). Tudo aqui foi conferido contra a
 * documentação oficial (open.shopee.com/developer-guide):
 *  - Autorização: link fixo por ambiente/região + partner_id, auth_type,
 *    redirect_uri, response_type e state, SEM assinatura.
 *  - Token: access_token dura 4h, refresh_token 30 dias; cada renovação
 *    devolve um refresh_token novo que PRECISA ser salvo.
 *  - Assinatura: HMAC-SHA256(partner_key, partner_id + path + timestamp
 *    [+ access_token + shop_id nas APIs de loja]), hex minúsculo.
 *  - Push: Authorization = HMAC-SHA256(partner_key, URL + "|" + corpo cru).
 */

const API_HOSTS = {
  // Hosts de produção variam só pela localização do servidor do developer
  // (latência), não pela região do vendedor — "near US" cobre a Vercel.
  production: "https://openplatform.shopee.com.br",
  sandbox: "https://openplatform.sandbox.test-stable.shopee.sg",
};
const AUTH_HOSTS = {
  production: "https://open.shopee.com.br",
  sandbox: "https://open.sandbox.test-stable.shopee.com.br",
};

export interface ShopeeConfig {
  partnerId: string;
  partnerKey: string;
  sandbox: boolean;
  apiHost: string;
  authHost: string;
}

export interface ShopeeCredentials {
  access_token: string;
  refresh_token: string;
  /** Epoch em ms de quando o access_token deixa de valer. */
  expires_at: number;
  shop_id: string;
}

export interface ShopeeOrder {
  order_sn: string;
  order_status?: string;
  currency?: string;
  total_amount?: number;
  create_time?: number;
  buyer_username?: string;
  item_list?: { item_name?: string; model_name?: string }[];
}

/** null quando SHOPEE_PARTNER_ID/SHOPEE_PARTNER_KEY não estão configurados. */
export function getShopeeConfig(): ShopeeConfig | null {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  if (!partnerId || !partnerKey) return null;
  const sandbox = process.env.SHOPEE_ENV === "sandbox";
  return {
    partnerId,
    partnerKey,
    sandbox,
    apiHost: process.env.SHOPEE_API_HOST || (sandbox ? API_HOSTS.sandbox : API_HOSTS.production),
    authHost: sandbox ? AUTH_HOSTS.sandbox : AUTH_HOSTS.production,
  };
}

function requireConfig(): ShopeeConfig {
  const cfg = getShopeeConfig();
  if (!cfg) throw new Error("SHOPEE_PARTNER_ID/SHOPEE_PARTNER_KEY não configurados no ambiente");
  return cfg;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Assinatura de uma chamada. APIs públicas (token get/refresh): sem
 * accessToken/shopId. APIs de loja: ambos, nessa ordem.
 */
export function signShopeeRequest(params: {
  partnerId: string;
  partnerKey: string;
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: string;
}): string {
  const base = `${params.partnerId}${params.path}${params.timestamp}${params.accessToken ?? ""}${params.shopId ?? ""}`;
  return crypto.createHmac("sha256", params.partnerKey).update(base).digest("hex");
}

/** Link que o vendedor abre pra autorizar o app. `redirectUri` precisa ter o mesmo domínio cadastrado no Console. */
export function buildShopeeAuthUrl(redirectUri: string, state: string): string {
  const cfg = requireConfig();
  const url = new URL(`${cfg.authHost}/auth`);
  url.searchParams.set("partner_id", cfg.partnerId);
  url.searchParams.set("auth_type", "seller");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

interface TokenResponse {
  error?: string;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  expire_in?: number;
}

function credentialsFromTokenResponse(data: TokenResponse, shopId: string): ShopeeCredentials {
  if (data.error || !data.access_token || !data.refresh_token) {
    throw new Error(`Shopee: ${data.error || "resposta sem token"}${data.message ? ` - ${data.message}` : ""}`);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expire_in ?? 14400) * 1000,
    shop_id: shopId,
  };
}

async function postPublic(path: string, body: Record<string, unknown>): Promise<TokenResponse> {
  const cfg = requireConfig();
  const timestamp = nowSeconds();
  const sign = signShopeeRequest({ partnerId: cfg.partnerId, partnerKey: cfg.partnerKey, path, timestamp });
  const url = `${cfg.apiHost}${path}?partner_id=${cfg.partnerId}&timestamp=${timestamp}&sign=${sign}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, partner_id: Number(cfg.partnerId) }),
  });
  if (!res.ok) throw new Error(`Shopee respondeu ${res.status} em ${path}`);
  return (await res.json()) as TokenResponse;
}

/** Troca o `code` do redirect (válido 1 vez, 10 min) por access_token + refresh_token. */
export async function exchangeShopeeCode(code: string, shopId: string): Promise<ShopeeCredentials> {
  const data = await postPublic("/api/v2/auth/token/get", { code, shop_id: Number(shopId) });
  return credentialsFromTokenResponse(data, shopId);
}

export async function refreshShopeeTokens(shopId: string, refreshToken: string): Promise<ShopeeCredentials> {
  const data = await postPublic("/api/v2/auth/access_token/get", { shop_id: Number(shopId), refresh_token: refreshToken });
  return credentialsFromTokenResponse(data, shopId);
}

type IntegrationRef = { id: string; credential_secret_id: string | null };

async function loadCredentials(admin: SupabaseClient, integration: IntegrationRef): Promise<ShopeeCredentials> {
  if (!integration.credential_secret_id) throw new Error("Integração Shopee sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial Shopee não encontrada no Vault");
  return JSON.parse(raw) as ShopeeCredentials;
}

/**
 * Devolve credenciais com access_token ainda válido, renovando (e salvando o
 * par novo no Vault) quando faltar menos de 1 minuto — ou sempre, com `force`.
 */
export async function getValidShopeeCredentials(
  admin: SupabaseClient,
  integration: IntegrationRef,
  force = false
): Promise<ShopeeCredentials> {
  const current = await loadCredentials(admin, integration);
  if (!force && current.expires_at - Date.now() > 60_000) return current;

  const refreshed = await refreshShopeeTokens(current.shop_id, current.refresh_token);
  await setIntegrationCredential(admin, integration.credential_secret_id, JSON.stringify(refreshed), `shopee:${integration.id}`);
  return refreshed;
}

async function callOrderDetail(creds: ShopeeCredentials, orderSn: string) {
  const cfg = requireConfig();
  const path = "/api/v2/order/get_order_detail";
  const timestamp = nowSeconds();
  const sign = signShopeeRequest({
    partnerId: cfg.partnerId,
    partnerKey: cfg.partnerKey,
    path,
    timestamp,
    accessToken: creds.access_token,
    shopId: creds.shop_id,
  });
  const url = new URL(`${cfg.apiHost}${path}`);
  url.searchParams.set("partner_id", cfg.partnerId);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("access_token", creds.access_token);
  url.searchParams.set("shop_id", creds.shop_id);
  url.searchParams.set("sign", sign);
  url.searchParams.set("order_sn_list", orderSn);
  // total_amount e item_list só vêm se pedidos explicitamente. Não pedimos
  // recipient_address (endereço/telefone do comprador) — não é necessário.
  url.searchParams.set("response_optional_fields", "total_amount,item_list,buyer_username");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Shopee respondeu ${res.status} ao buscar o pedido ${orderSn}`);
  return (await res.json()) as { error?: string; message?: string; response?: { order_list?: ShopeeOrder[] } };
}

export async function fetchShopeeOrderForIntegration(
  admin: SupabaseClient,
  integration: IntegrationRef,
  orderSn: string
): Promise<ShopeeOrder> {
  let creds = await getValidShopeeCredentials(admin, integration);
  let json = await callOrderDetail(creds, orderSn);

  // Token recusado (ex.: expirou entre a leitura e a chamada): renova 1 vez e repete.
  if (json.error && /auth|token/i.test(json.error)) {
    creds = await getValidShopeeCredentials(admin, integration, true);
    json = await callOrderDetail(creds, orderSn);
  }
  if (json.error) throw new Error(`Shopee: ${json.error}${json.message ? ` - ${json.message}` : ""}`);

  const order = json.response?.order_list?.[0];
  if (!order) throw new Error(`Pedido ${orderSn} não encontrado na resposta da Shopee`);
  return order;
}

/**
 * Status do pedido na Shopee -> status do StudioMaker. Valores confirmados
 * na doc de get_order_list: UNPAID/READY_TO_SHIP/PROCESSED/SHIPPED/COMPLETED/
 * IN_CANCEL/CANCELLED/INVOICE_PENDING (mais PENDING e TO_CONFIRM_RECEIVE).
 * INVOICE_PENDING é só do Brasil (aguardando NF-e) e já está pago — suposição
 * a validar no sandbox.
 */
export function mapShopeeOrderStatus(status?: string): "paid" | "cancelled" | null {
  switch (status) {
    case "READY_TO_SHIP":
    case "PROCESSED":
    case "SHIPPED":
    case "TO_CONFIRM_RECEIVE":
    case "COMPLETED":
    case "INVOICE_PENDING":
      return "paid";
    case "CANCELLED":
      return "cancelled";
    default:
      // UNPAID, PENDING, IN_CANCEL, TO_RETURN: não é venda confirmada (ou o
      // pedido ainda está sendo decidido) — não mexe no registro.
      return null;
  }
}

/** Cria/atualiza a venda a partir de um pedido da Shopee. Idempotente via (user_id, source, external_order_id). */
export async function upsertQuoteFromShopeeOrder(admin: SupabaseClient, userId: string, order: ShopeeOrder) {
  const status = mapShopeeOrderStatus(order.order_status);
  if (!status) return null;

  const firstItem = order.item_list?.[0];
  const { data, error } = await admin
    .from("quotes")
    .upsert(
      {
        user_id: userId,
        project_name: firstItem?.item_name || "Venda Shopee",
        final_price: Number(order.total_amount ?? 0),
        platform_fee: 0,
        cost_amount: 0,
        status,
        source: "shopee",
        external_order_id: order.order_sn,
        buyer_name: order.buyer_username || null,
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

/** Authorization do push = HMAC-SHA256(partner_key, URL + "|" + corpo cru), hex. A URL é a cadastrada no Console. */
export function validateShopeePushSignature(params: {
  url: string;
  rawBody: string;
  authHeader: string | null;
  partnerKey: string;
}): boolean {
  if (!params.authHeader) return false;
  const expected = crypto.createHmac("sha256", params.partnerKey).update(`${params.url}|${params.rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(params.authHeader.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Acha a integração conectada pelo shop_id (guardado dentro da credencial no Vault). */
export async function findShopeeIntegrationByShopId(admin: SupabaseClient, shopId: string | number) {
  const { data: integrations } = await admin
    .from("integrations")
    .select("id, credential_secret_id, user_id")
    .eq("platform", "shopee")
    .eq("status", "connected");

  for (const integration of integrations ?? []) {
    if (!integration.credential_secret_id) continue;
    try {
      const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
      if (raw && JSON.parse(raw).shop_id === String(shopId)) return integration;
    } catch {
      // Credencial ilegível — pula pra próxima.
    }
  }
  return null;
}

/** Mesmo efeito do botão Desconectar: apaga a credencial do Vault e marca como desconectada. */
export async function disconnectShopeeIntegration(admin: SupabaseClient, integration: IntegrationRef) {
  if (integration.credential_secret_id) {
    try {
      await deleteIntegrationCredential(admin, integration.credential_secret_id);
    } catch (err) {
      console.error("[shopee] falha ao apagar credencial do Vault", err);
    }
  }
  await admin
    .from("integrations")
    .update({ status: "disconnected", credential_secret_id: null, webhook_secret: null, last_event_at: null })
    .eq("id", integration.id);
}
