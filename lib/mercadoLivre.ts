import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";

/**
 * Shape de GET /orders/{id} - campos confirmados via busca (status,
 * total_amount, buyer, order_items, payments existem de verdade), mas a
 * estrutura exata de payments[].marketplace_fee e order_items[].item não foi
 * possível confirmar contra a doc oficial (developers.mercadolibre.com.br
 * bloqueou o fetch com 403). Extração abaixo é best-effort com fallback pra
 * "não sei" em vez de quebrar - **validar contra um payload real** assim que
 * a primeira notificação chegar de verdade (mesma ressalva já feita pro
 * Mercado Pago em lib/mercadoPago.ts).
 */
interface MlOrder {
  id: number;
  status: string;
  date_created?: string;
  total_amount?: number;
  buyer?: { nickname?: string; first_name?: string; last_name?: string };
  order_items?: { item?: { title?: string }; quantity?: number; unit_price?: number }[];
  payments?: { id: number; status?: string; transaction_amount?: number; marketplace_fee?: number }[];
}

export interface MlOAuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number;
  obtained_at: string;
}

function mlOAuthCredentials() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MERCADO_LIVRE_CLIENT_ID/MERCADO_LIVRE_CLIENT_SECRET não configurados no ambiente");
  }
  return { clientId, clientSecret };
}

/**
 * Troca o `code` do redirect de OAuth por access_token + refresh_token.
 * Diferente do Mercado Pago (que aceita JSON), o endpoint de token do
 * Mercado Livre exige application/x-www-form-urlencoded - confirmado na doc.
 */
export async function exchangeMercadoLivreCode(code: string, redirectUri: string): Promise<MlOAuthTokens> {
  const { clientId, clientSecret } = mlOAuthCredentials();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Mercado Livre respondeu ${res.status} ao trocar o código de autorização`);
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

/** Renova o access_token (dura ~6h). O refresh_token é de uso único - a resposta sempre traz um novo, que precisa ser salvo por cima do antigo. */
export async function refreshMercadoLivreTokens(refreshToken: string): Promise<MlOAuthTokens> {
  const { clientId, clientSecret } = mlOAuthCredentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Mercado Livre respondeu ${res.status} ao renovar o token`);
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

async function loadTokens(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<MlOAuthTokens> {
  if (!integration.credential_secret_id) throw new Error("Integração sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial não encontrada no Vault");
  return JSON.parse(raw) as MlOAuthTokens;
}

async function refreshAndSave(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  refreshToken: string
): Promise<MlOAuthTokens> {
  const refreshed = await refreshMercadoLivreTokens(refreshToken);
  if (integration.credential_secret_id) {
    await setIntegrationCredential(
      admin,
      integration.credential_secret_id,
      JSON.stringify(refreshed),
      `mercado_livre:${integration.id}`
    );
  }
  return refreshed;
}

async function fetchOrderRaw(accessToken: string, orderId: string) {
  const res = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { res, order: res.ok ? ((await res.json()) as MlOrder) : null };
}

export async function fetchMercadoLivreOrderForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<MlOrder> {
  const tokens = await loadTokens(admin, integration);

  let { res, order } = await fetchOrderRaw(tokens.access_token, orderId);

  if (res.status === 401) {
    const refreshed = await refreshAndSave(admin, integration, tokens.refresh_token);
    ({ res, order } = await fetchOrderRaw(refreshed.access_token, orderId));
  }

  if (!res.ok || !order) {
    throw new Error(`Mercado Livre respondeu ${res.status} ao buscar o pedido ${orderId}`);
  }
  return order;
}

/** Mapeia status do pedido pros status já usados no fluxo de Vendas. */
function mapMercadoLivreOrderStatus(status: string): "paid" | "cancelled" | null {
  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "cancelled" || status === "invalid") return "cancelled";
  // payment_required, payment_in_process, partially_paid: ainda não é venda concluída.
  return null;
}

/**
 * Cria/atualiza a venda a partir de um pedido do Mercado Livre. Idempotente
 * via unique index (user_id, source, external_order_id).
 */
export async function upsertQuoteFromMercadoLivreOrder(admin: SupabaseClient, userId: string, order: MlOrder) {
  const status = mapMercadoLivreOrderStatus(order.status);
  if (!status) return null;

  const firstItem = order.order_items?.[0];
  const grossAmount = Number(order.total_amount ?? firstItem?.unit_price ?? 0);
  const platformFee = (order.payments ?? []).reduce((sum, p) => sum + (Number(p.marketplace_fee) || 0), 0);

  const buyerName =
    [order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(" ").trim() ||
    order.buyer?.nickname ||
    null;
  const productName = firstItem?.item?.title || "Venda Mercado Livre";

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
        source: "mercado_livre",
        external_order_id: String(order.id),
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
