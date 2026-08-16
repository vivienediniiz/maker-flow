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

export interface MpOAuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number;
  obtained_at: string;
}

function mpOAuthCredentials() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MERCADOPAGO_CLIENT_ID/MERCADOPAGO_CLIENT_SECRET não configurados no ambiente");
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
    expires_in: data.expires_in,
    obtained_at: new Date().toISOString(),
  };
}

async function fetchPaymentRaw(accessToken: string, paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { res, payment: res.ok ? ((await res.json()) as MpPayment) : null };
}

/**
 * Busca um pagamento pra uma integração conectada via OAuth, renovando o
 * access_token automaticamente (uma vez) se a API responder 401 - o access
 * token dura 180 dias mas pode ter sido revogado/expirado antes disso.
 */
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

/** Mesma lógica de renovação automática, pro fallback "Sincronizar Pedidos". */
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

/**
 * Só cria/atualiza a venda quando o pagamento está aprovado - pendente/rejeitado
 * não vira registro em `quotes` (evita poluir Vendas com tentativas não concluídas).
 * Idempotente via unique index (user_id, source, external_order_id): reprocessar
 * o mesmo pagamento (retry de webhook, ou "Sincronizar") faz upsert, não duplica.
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
 * conforme o formato documentado (ts + v1 separados por vírgula). Só roda se
 * a integração tiver um webhook_secret configurado (opcional) - sem ele, a
 * defesa real continua sendo "nunca confiar no payload, sempre reconsultar
 * a API do MP com o access token guardado".
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
