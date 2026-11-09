import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";
import { saveMarketplaceSales, type MarketplaceSale } from "@/lib/marketplaceSales";

const TOKEN_BASE_URL = "https://auth.tiktok-shops.com";
const API_BASE_URL = "https://open-api.tiktokglobalshop.com";

export interface TikTokShopTokens {
  access_token: string;
  access_token_expire_in: number; // unix timestamp
  refresh_token: string;
  refresh_token_expire_in: number; // unix timestamp
  open_id: string;
  seller_name: string;
  seller_base_region: string;
  user_type: number;
  granted_scopes: string[];
  /** Obtido separadamente via Get Authorized Shops logo após o token exchange — necessário em quase toda chamada de API. */
  shop_cipher?: string;
  shop_id?: string;
}

export interface TikTokShopOrder {
  id: string;
  status: string;
  user_id?: string;
  create_time?: number;
  payment?: {
    currency?: string;
    total_amount?: string;
    original_total_product_price?: string;
  };
  recipient_address?: {
    name?: string;
  };
  line_items?: { product_name?: string; sku_name?: string }[];
}

function tiktokShopCredentials() {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error("TIKTOK_APP_KEY/TIKTOK_APP_SECRET não configurados no ambiente");
  }
  return { appKey, appSecret };
}

/**
 * Algoritmo oficial de assinatura de requisições de API do TikTok Shop
 * (https://partner.tiktokshop.com/docv2/page/sign-your-api-request) — NÃO é
 * o mesmo algoritmo usado pra verificar assinatura de webhook (ver
 * `validateTikTokShopWebhookSignature` abaixo, que é bem mais simples).
 *
 * 1. Pega todos os query params exceto `sign` e `access_token`, ordena as
 *    chaves alfabeticamente.
 * 2. Concatena no formato {key}{value}, sem separador.
 * 3. Prefixa com o path da requisição.
 * 4. Se o content-type não é multipart/form-data, anexa o body EXATO (bytes
 *    crus) que será enviado — nunca reserializar.
 * 5. Envolve tudo com o app_secret: secret + input + secret.
 * 6. HMAC-SHA256 usando app_secret como chave, resultado em hex minúsculo.
 */
export function signTikTokShopRequest(params: {
  path: string;
  query: Record<string, string>;
  body?: string;
  appSecret: string;
}): string {
  const { path, query, body, appSecret } = params;

  const keys = Object.keys(query)
    .filter((k) => k !== "sign" && k !== "access_token")
    .sort();

  const paramString = keys.map((k) => `${k}${query[k]}`).join("");
  let input = path + paramString;
  if (body) input += body;
  input = appSecret + input + appSecret;

  return crypto.createHmac("sha256", appSecret).update(input).digest("hex");
}

/**
 * Monta a URL assinada pra uma chamada da API do TikTok Shop. Em chamadas com
 * corpo (POST), passe em `body` os MESMOS bytes que serão enviados: eles
 * entram na assinatura, mas não na URL.
 */
function buildSignedUrl(path: string, query: Record<string, string>, appKey: string, appSecret: string, body?: string): string {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const fullQuery = { ...query, app_key: appKey, timestamp };
  const sign = signTikTokShopRequest({ path, query: fullQuery, body, appSecret });

  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(fullQuery)) url.searchParams.set(k, v);
  url.searchParams.set("sign", sign);
  return url.toString();
}

/**
 * Troca o `auth_code` do redirect de OAuth por access_token + refresh_token.
 * `grant_type=authorized_code` é intencional (não é o `authorization_code`
 * padrão de OAuth) — confirmado na doc oficial, não "corrigir".
 */
export async function exchangeTikTokShopCode(authCode: string): Promise<Omit<TikTokShopTokens, "shop_cipher" | "shop_id">> {
  const { appKey, appSecret } = tiktokShopCredentials();

  const url = new URL(`${TOKEN_BASE_URL}/api/v2/token/get`);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("auth_code", authCode);
  url.searchParams.set("grant_type", "authorized_code");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TikTok Shop respondeu ${res.status} ao trocar o código de autorização`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok Shop: ${json.message ?? "falha ao obter token"}`);
  return json.data;
}

export async function refreshTikTokShopToken(refreshToken: string): Promise<Omit<TikTokShopTokens, "shop_cipher" | "shop_id">> {
  const { appKey, appSecret } = tiktokShopCredentials();

  const url = new URL(`${TOKEN_BASE_URL}/api/v2/token/refresh`);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("refresh_token", refreshToken);
  url.searchParams.set("grant_type", "refresh_token");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TikTok Shop respondeu ${res.status} ao renovar o token`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok Shop: ${json.message ?? "falha ao renovar token"}`);
  return json.data;
}

/** Busca as lojas autorizadas pro token — usado só pra obter o `shop_cipher`, exigido em quase toda outra chamada de API. */
export async function fetchTikTokShopAuthorizedShops(
  accessToken: string
): Promise<{ shop_cipher: string; shop_id: string }[]> {
  const { appKey, appSecret } = tiktokShopCredentials();
  const url = buildSignedUrl("/authorization/202309/shops", {}, appKey, appSecret);

  const res = await fetch(url, { headers: { "x-tts-access-token": accessToken } });
  if (!res.ok) throw new Error(`TikTok Shop respondeu ${res.status} ao buscar lojas autorizadas`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok Shop: ${json.message ?? "falha ao buscar lojas autorizadas"}`);
  return (json.data?.shops ?? []).map((s: { cipher: string; id: string }) => ({ shop_cipher: s.cipher, shop_id: s.id }));
}

async function loadTokens(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<TikTokShopTokens> {
  if (!integration.credential_secret_id) throw new Error("Integração TikTok Shop sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial TikTok Shop não encontrada no Vault");
  return JSON.parse(raw) as TikTokShopTokens;
}

async function refreshAndSave(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  current: TikTokShopTokens
): Promise<TikTokShopTokens> {
  const refreshed = await refreshTikTokShopToken(current.refresh_token);
  const merged: TikTokShopTokens = { ...refreshed, shop_cipher: current.shop_cipher, shop_id: current.shop_id };
  if (integration.credential_secret_id) {
    await setIntegrationCredential(admin, integration.credential_secret_id, JSON.stringify(merged), `tiktok_shop:${integration.id}`);
  }
  return merged;
}

/** Código "Expired credentials" da doc de erros comuns do TikTok Shop: renovar o token. */
const TOKEN_EXPIRED_CODE = 105002;
const ORDER_DETAIL_PATH = "/order/202507/orders";
const ORDER_SEARCH_PATH = "/order/202309/orders/search";

type IntegrationRef = { id: string; credential_secret_id: string | null };

/**
 * Executa uma chamada da API com o token da integração; se o token expirou
 * (HTTP 401 ou código 105002), renova, salva o par novo e repete 1 vez.
 * Devolve `data` da resposta, ou lança com a mensagem do TikTok Shop.
 */
async function withTikTokShopTokens(
  admin: SupabaseClient,
  integration: IntegrationRef,
  run: (accessToken: string, shopCipher: string) => Promise<{ res: Response; json: any }>
) {
  let tokens = await loadTokens(admin, integration);
  const shopCipher = tokens.shop_cipher;
  if (!shopCipher) throw new Error("Integração TikTok Shop sem shop_cipher salvo — reconecte a integração.");

  let out = await run(tokens.access_token, shopCipher);
  if (out.res.status === 401 || out.json?.code === TOKEN_EXPIRED_CODE) {
    tokens = await refreshAndSave(admin, integration, tokens);
    out = await run(tokens.access_token, shopCipher);
  }

  if (!out.res.ok || !out.json || out.json.code !== 0) {
    throw new Error(`TikTok Shop respondeu ${out.res.status}${out.json?.message ? `: ${out.json.message}` : ""}`);
  }
  return out.json.data;
}

/** Detalhes de pedidos, em lotes de até 50 ids (limite da API). */
export async function fetchTikTokShopOrdersByIds(
  admin: SupabaseClient,
  integration: IntegrationRef,
  ids: string[]
): Promise<TikTokShopOrder[]> {
  const { appKey, appSecret } = tiktokShopCredentials();
  const orders: TikTokShopOrder[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await withTikTokShopTokens(admin, integration, async (accessToken, shopCipher) => {
      const url = buildSignedUrl(ORDER_DETAIL_PATH, { ids: chunk.join(","), shop_cipher: shopCipher }, appKey, appSecret);
      const res = await fetch(url, { headers: { "content-type": "application/json", "x-tts-access-token": accessToken } });
      return { res, json: res.ok ? await res.json() : null };
    });
    orders.push(...((data?.orders ?? []) as TikTokShopOrder[]));
  }
  return orders;
}

export async function fetchTikTokShopOrderForIntegration(
  admin: SupabaseClient,
  integration: IntegrationRef,
  orderId: string
): Promise<TikTokShopOrder> {
  const [order] = await fetchTikTokShopOrdersByIds(admin, integration, [orderId]);
  if (!order) throw new Error(`Pedido ${orderId} não encontrado na resposta do TikTok Shop`);
  return order;
}

/**
 * Pedidos atualizados desde `sinceSeconds` (Get Order List, POST
 * /order/202309/orders/search). Pagina com `next_page_token`, até `maxPages`
 * páginas de 100.
 */
export async function listTikTokShopOrdersUpdatedSince(
  admin: SupabaseClient,
  integration: IntegrationRef,
  sinceSeconds: number,
  maxPages = 10
): Promise<TikTokShopOrder[]> {
  const { appKey, appSecret } = tiktokShopCredentials();
  const body = JSON.stringify({ update_time_ge: sinceSeconds });
  const orders: TikTokShopOrder[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const data = await withTikTokShopTokens(admin, integration, async (accessToken, shopCipher) => {
      const query: Record<string, string> = { page_size: "100", sort_field: "update_time", sort_order: "DESC", shop_cipher: shopCipher };
      if (pageToken) query.page_token = pageToken;
      const url = buildSignedUrl(ORDER_SEARCH_PATH, query, appKey, appSecret, body);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tts-access-token": accessToken },
        body,
      });
      return { res, json: res.ok ? await res.json() : null };
    });
    orders.push(...((data?.orders ?? []) as TikTokShopOrder[]));
    pageToken = data?.next_page_token || undefined;
    if (!pageToken) break;
  }
  return orders;
}

/**
 * Mapeia status do TikTok Shop pro status do StudioMaker. Valores possíveis
 * (confirmados na doc do webhook "Order status change"): UNPAID, ON_HOLD,
 * AWAITING_SHIPMENT, AWAITING_COLLECTION, CANCEL, IN_TRANSIT, DELIVERED,
 * COMPLETED.
 */
function mapTikTokShopOrderStatus(status: string): "paid" | "cancelled" | null {
  if (["AWAITING_SHIPMENT", "AWAITING_COLLECTION", "IN_TRANSIT", "DELIVERED", "COMPLETED"].includes(status)) return "paid";
  if (status === "CANCEL") return "cancelled";
  // UNPAID, ON_HOLD: ainda não é venda concluída.
  return null;
}

/** Converte um pedido do TikTok Shop em venda do StudioMaker; null quando ainda não é venda confirmada. */
export function tiktokShopOrderToSale(userId: string, order: TikTokShopOrder): MarketplaceSale | null {
  const status = mapTikTokShopOrderStatus(order.status);
  if (!status) return null;

  const firstItem = order.line_items?.[0];
  return {
    row: {
      user_id: userId,
      project_name: firstItem?.product_name || firstItem?.sku_name || "Venda TikTok Shop",
      final_price: Number(order.payment?.total_amount ?? 0),
      platform_fee: 0,
      cost_amount: 0,
      status,
      source: "tiktok_shop",
      external_order_id: order.id,
      buyer_name: order.recipient_address?.name || null,
      sent_at: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
      client_id: null,
      product_id: null,
      weight_g: 0,
      print_time_min: 0,
      energy_cost: 0,
      filament_cost: 0,
      margin_percent: 0,
    },
  };
}

/**
 * Registra a venda de um pedido do TikTok Shop. Pedido novo entra completo;
 * pedido já existente só tem o status ajustado — edições do maker (produto,
 * custo, andamento) ficam como estão. Idempotente.
 */
export async function upsertQuoteFromTikTokShopOrder(admin: SupabaseClient, userId: string, order: TikTokShopOrder) {
  const sale = tiktokShopOrderToSale(userId, order);
  if (!sale) return null;
  return saveMarketplaceSales(admin, [sale]);
}

export interface TikTokShopSyncResult {
  /** Pedidos devolvidos pelo TikTok Shop na janela. */
  found: number;
  /** Pedidos que ainda não são venda (ex.: UNPAID) e foram ignorados. */
  ignored: number;
  inserted: number;
  updated: number;
  unchanged: number;
}

/**
 * Reconciliação: busca no TikTok Shop os pedidos atualizados nos últimos
 * `sinceDays` dias e registra os que faltam (webhook perdido, integração
 * conectada depois do pedido) ou cujo status mudou. É o plano B do webhook —
 * usado pelo botão "Sincronizar Pedidos" e pela rotina diária.
 */
export async function syncTikTokShopOrders(
  admin: SupabaseClient,
  integration: IntegrationRef & { user_id: string },
  opts: { sinceDays: number; maxPages?: number }
): Promise<TikTokShopSyncResult> {
  const since = Math.floor(Date.now() / 1000) - Math.round(opts.sinceDays * 86400);
  const listed = await listTikTokShopOrdersUpdatedSince(admin, integration, since, opts.maxPages);

  // A listagem pode vir sem itens: completa com Get Order Detail só os que faltam.
  const incomplete = listed.filter((o) => !o.line_items).map((o) => o.id);
  const detailed = new Map(
    (incomplete.length ? await fetchTikTokShopOrdersByIds(admin, integration, incomplete) : []).map((o) => [o.id, o])
  );

  const sales: MarketplaceSale[] = [];
  let ignored = 0;
  for (const order of listed) {
    const sale = tiktokShopOrderToSale(integration.user_id, detailed.get(order.id) ?? order);
    if (sale) sales.push(sale);
    else ignored++;
  }

  const saved = await saveMarketplaceSales(admin, sales);
  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);
  return { found: listed.length, ignored, ...saved };
}

/**
 * Valida a assinatura de webhook do TikTok Shop — ALGORITMO DIFERENTE do
 * usado pra assinar chamadas de API (ver `signTikTokShopRequest` acima).
 * Confirmado em https://partner.tiktokshop.com/docv2/page/webhooks-configuration-guide:
 * o header `Authorization` traz HMAC-SHA256({app_key}{raw_body}) usando o
 * app_secret como chave, em hex minúsculo. Precisa do body CRU, sem
 * reparsear/reserializar.
 */
export function validateTikTokShopWebhookSignature(params: {
  authHeader: string | null;
  rawBody: string;
  appKey: string;
  appSecret: string;
}): boolean {
  if (!params.authHeader) return false;
  const expected = crypto
    .createHmac("sha256", params.appSecret)
    .update(`${params.appKey}${params.rawBody}`)
    .digest("hex");
  return params.authHeader === expected;
}
