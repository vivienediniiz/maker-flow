import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";

interface MpFeeDetail {
  amount: number;
}

interface MpPayment {
  id: number;
  status: string;
  transaction_amount: number;
  date_created: string;
  fee_details?: MpFeeDetail[];
  payer?: { first_name?: string; last_name?: string; email?: string };
  description?: string;
  additional_info?: { items?: { title?: string }[] };
}

/**
 * Shape de GET /v1/orders/{id} (Orders API) - a doc oficial desse endpoint
 * não carregou pra confirmação (404 em duas tentativas, provável pagina
 * client-side-only), então os campos aqui são best-effort com base no que
 * a documentação de notificações + buscas cruzadas confirmaram. Os opcionais
 * têm fallback pra "não sei" em vez de quebrar - mas os nomes exatos de
 * `transactions.payments[].fee_details` e `payer` PRECISAM ser conferidos
 * contra um payload real assim que a primeira notificação chegar de verdade.
 */
interface MpOrder {
  id: string;
  status: string;
  total_amount?: string | number;
  date_created?: string;
  external_reference?: string | null;
  payer?: { first_name?: string; last_name?: string; email?: string };
  items?: { title?: string; description?: string }[];
  transactions?: {
    payments?: {
      id: string | number;
      amount?: string | number;
      status?: string;
      fee_details?: MpFeeDetail[];
    }[];
  };
}

export interface MpOAuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: number;
  public_key?: string;
  expires_in: number;
  obtained_at: string;
}

function mpOAuthCredentials() {
  const clientId = process.env.MERCADO_PAGO_VENDAS_CLIENT_ID;
  const clientSecret = process.env.MERCADO_PAGO_VENDAS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MERCADO_PAGO_VENDAS_CLIENT_ID/MERCADO_PAGO_VENDAS_CLIENT_SECRET não configurados no ambiente");
  }
  return { clientId, clientSecret };
}

/** Troca o `code` do redirect de OAuth por access_token + refresh_token. */
export async function exchangeMercadoPagoCode(code: string, redirectUri: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = mpOAuthCredentials();

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao trocar o código de autorização`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    public_key: data.public_key,
    expires_in: data.expires_in,
    obtained_at: new Date().toISOString(),
  };
}

/** Renova o access_token usando o refresh_token (access token dura 180 dias). */
export async function refreshMercadoPagoTokens(refreshToken: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = mpOAuthCredentials();

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao renovar o token`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    public_key: data.public_key,
    expires_in: data.expires_in,
    obtained_at: new Date().toISOString(),
  };
}

async function loadTokens(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<MpOAuthTokens> {
  if (!integration.credential_secret_id) throw new Error("Integração sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial não encontrada no Vault");
  return JSON.parse(raw) as MpOAuthTokens;
}

async function refreshAndSave(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  refreshToken: string
): Promise<MpOAuthTokens> {
  const refreshed = await refreshMercadoPagoTokens(refreshToken);
  if (integration.credential_secret_id) {
    await setIntegrationCredential(
      admin,
      integration.credential_secret_id,
      JSON.stringify(refreshed),
      `mercado_pago:${integration.id}`
    );
  }
  return refreshed;
}

// ---- Orders API (webhook em tempo real - o que a aplicação "MakerFlow Vendas" está configurada pra usar) ----

async function fetchOrderRaw(accessToken: string, orderId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { res, order: res.ok ? ((await res.json()) as MpOrder) : null };
}

export async function fetchMercadoPagoOrderForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<MpOrder> {
  const tokens = await loadTokens(admin, integration);

  let { res, order } = await fetchOrderRaw(tokens.access_token, orderId);

  if (res.status === 401) {
    const refreshed = await refreshAndSave(admin, integration, tokens.refresh_token);
    ({ res, order } = await fetchOrderRaw(refreshed.access_token, orderId));
  }

  if (!res.ok || !order) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao buscar o pedido ${orderId}`);
  }
  return order;
}

/** Mapeia status da Orders API pros status já usados no fluxo de Vendas - sem inventar nenhum novo. */
function mapMercadoPagoOrderStatus(status: string): "paid" | null {
  // "processed" = pedido pago e processado com sucesso. Os demais (created,
  // action_required, expired, cancelled...) não viram venda - ainda não
  // houve pagamento confirmado, ou o pedido não foi concluído.
  if (status === "processed") return "paid";
  return null;
}

/**
 * Cria/atualiza a venda a partir de um pedido da Orders API. Idempotente
 * via unique index (user_id, source, external_order_id) - mas usa o ID do
 * PAGAMENTO subjacente (transactions.payments[0].id), não o ID do pedido
 * (`ORD...`), pra ficar no mesmo espaço de IDs que upsertQuoteFromMercadoPagoPayment
 * (usado pelo "Sincronizar Pedidos", que ainda usa a Payments API de busca -
 * não existe endpoint de busca documentado pra Orders API). Isso evita criar
 * dois registros duplicados pra mesma venda se as duas rotas processarem o
 * mesmo evento.
 */
export async function upsertQuoteFromMercadoPagoOrder(admin: SupabaseClient, userId: string, order: MpOrder) {
  const status = mapMercadoPagoOrderStatus(order.status);
  if (!status) return null;

  const payment = order.transactions?.payments?.[0] ?? null;
  const externalId = payment ? String(payment.id) : order.id;

  const platformFee = (payment?.fee_details ?? []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const grossAmount = Number(payment?.amount ?? order.total_amount ?? 0);

  const buyerName =
    [order.payer?.first_name, order.payer?.last_name].filter(Boolean).join(" ").trim() ||
    order.payer?.email ||
    null;
  const productName = order.items?.[0]?.title || order.items?.[0]?.description || "Venda Mercado Pago";

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
        source: "mercado_pago",
        external_order_id: externalId,
        buyer_name: buyerName,
        sent_at: order.date_created ?? new Date().toISOString(),
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

// ---- Payments API (usada só pelo fallback "Sincronizar Pedidos" - não tem endpoint de busca documentado na Orders API) ----

async function fetchPaymentRaw(accessToken: string, paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { res, payment: res.ok ? ((await res.json()) as MpPayment) : null };
}

export async function fetchMercadoPagoPaymentForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  paymentId: string
): Promise<MpPayment> {
  const tokens = await loadTokens(admin, integration);

  let { res, payment } = await fetchPaymentRaw(tokens.access_token, paymentId);

  if (res.status === 401) {
    const refreshed = await refreshAndSave(admin, integration, tokens.refresh_token);
    ({ res, payment } = await fetchPaymentRaw(refreshed.access_token, paymentId));
  }

  if (!res.ok || !payment) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao buscar o pagamento ${paymentId}`);
  }
  return payment;
}

export async function searchMercadoPagoPaymentsForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  beginDateIso: string,
  endDateIso: string
): Promise<MpPayment[]> {
  const tokens = await loadTokens(admin, integration);

  async function search(accessToken: string) {
    const url = new URL("https://api.mercadopago.com/v1/payments/search");
    url.searchParams.set("sort", "date_created");
    url.searchParams.set("criteria", "desc");
    url.searchParams.set("range", "date_created");
    url.searchParams.set("begin_date", beginDateIso);
    url.searchParams.set("end_date", endDateIso);
    return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }

  let res = await search(tokens.access_token);
  if (res.status === 401) {
    const refreshed = await refreshAndSave(admin, integration, tokens.refresh_token);
    res = await search(refreshed.access_token);
  }
  if (!res.ok) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao buscar pagamentos`);
  }
  const body = await res.json();
  return Array.isArray(body.results) ? body.results : [];
}

/**
 * Só cria/atualiza a venda quando o pagamento está aprovado - pendente/rejeitado
 * não vira registro em `quotes` (evita poluir Vendas com tentativas não concluídas).
 * Idempotente via unique index (user_id, source, external_order_id): reprocessar
 * o mesmo pagamento (retry, ou "Sincronizar") faz upsert, não duplica - e usa o
 * mesmo ID de pagamento que upsertQuoteFromMercadoPagoOrder, então as duas
 * rotas convergem no mesmo registro em vez de duplicar.
 */
export async function upsertQuoteFromMercadoPagoPayment(
  admin: SupabaseClient,
  userId: string,
  payment: MpPayment
) {
  if (payment.status !== "approved") return null;

  const platformFee = (payment.fee_details ?? []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const buyerName =
    [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ").trim() ||
    payment.payer?.email ||
    null;
  const productName = payment.additional_info?.items?.[0]?.title || payment.description || "Venda Mercado Pago";

  const { data, error } = await admin
    .from("quotes")
    .upsert(
      {
        user_id: userId,
        project_name: productName,
        final_price: payment.transaction_amount,
        platform_fee: platformFee,
        cost_amount: 0,
        status: "paid",
        source: "mercado_pago",
        external_order_id: String(payment.id),
        buyer_name: buyerName,
        sent_at: payment.date_created,
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
 * Valida a assinatura HMAC que o Mercado Pago manda no header x-signature,
 * conforme o formato documentado (ts + v1 separados por vírgula). O segredo
 * é único pra aplicação inteira (MERCADO_PAGO_VENDAS_WEBHOOK_SECRET), já que
 * a URL de webhook também é única - não tem segredo por-integração. Sem essa
 * variável configurada, a defesa real continua sendo "nunca confiar no
 * payload, sempre reconsultar a API do MP com o access token guardado".
 */
export function validateMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!params.xSignature || !params.dataId) return false;

  const parts: Record<string, string> = {};
  for (const chunk of params.xSignature.split(",")) {
    const [key, value] = chunk.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", params.secret).update(manifest).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(v1);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
