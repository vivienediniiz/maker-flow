import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";

// Escopos cobrindo cotação, carrinho, compra, geração e impressão de
// etiqueta, além de rastreio — precisam estar habilitados no cadastro do
// app no painel do Melhor Envio, senão a autorização é rejeitada com
// "invalid_scope". "shipping-cart" não existe como escopo (causou o erro);
// o nome correto pra adicionar/ler o carrinho é cart-write/cart-read.
const OAUTH_SCOPES =
  "shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking cart-read cart-write";

function melhorEnvioHost() {
  // Sandbox não usa "www." — só a produção.
  return process.env.MELHOR_ENVIO_ENV === "production"
    ? "https://www.melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
}

export function melhorEnvioApiBase() {
  return `${melhorEnvioHost()}/api/v2`;
}

export function melhorEnvioAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(`${melhorEnvioHost()}/oauth/authorize`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("state", params.state);
  return url.toString();
}

function melhorEnvioOAuthCredentials() {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MELHOR_ENVIO_CLIENT_ID/MELHOR_ENVIO_CLIENT_SECRET não configurados no ambiente");
  }
  return { clientId, clientSecret };
}

export interface MelhorEnvioTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained_at: string;
}

async function requestToken(body: Record<string, string>): Promise<MelhorEnvioTokens> {
  const res = await fetch(`${melhorEnvioHost()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status} ao trocar/renovar o token`);
  }
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    obtained_at: new Date().toISOString(),
  };
}

/** Troca o `code` do redirect de OAuth por access_token + refresh_token. */
export async function exchangeMelhorEnvioCode(code: string, redirectUri: string): Promise<MelhorEnvioTokens> {
  const { clientId, clientSecret } = melhorEnvioOAuthCredentials();
  return requestToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
}

/** Renova o access_token usando o refresh_token. */
export async function refreshMelhorEnvioTokens(refreshToken: string): Promise<MelhorEnvioTokens> {
  const { clientId, clientSecret } = melhorEnvioOAuthCredentials();
  return requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

async function loadTokens(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<MelhorEnvioTokens> {
  if (!integration.credential_secret_id) throw new Error("Integração sem credencial salva");
  const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!raw) throw new Error("Credencial não encontrada no Vault");
  return JSON.parse(raw) as MelhorEnvioTokens;
}

async function refreshAndSave(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  refreshToken: string
): Promise<MelhorEnvioTokens> {
  const refreshed = await refreshMelhorEnvioTokens(refreshToken);
  if (integration.credential_secret_id) {
    await setIntegrationCredential(
      admin,
      integration.credential_secret_id,
      JSON.stringify(refreshed),
      `melhor_envio:${integration.id}`
    );
  }
  return refreshed;
}

/**
 * Chama a API do Melhor Envio com o token da integração, renovando uma vez
 * via refresh_token se a primeira tentativa voltar 401 — mesmo padrão lazy
 * (sem job agendado) usado em lib/mercadoPago.ts.
 */
export async function melhorEnvioFetchForIntegration(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  path: string,
  init?: RequestInit
): Promise<Response> {
  const tokens = await loadTokens(admin, integration);

  const doFetch = (accessToken: string) =>
    fetch(`${melhorEnvioApiBase()}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "StudioMaker (suporte@studiomaker.app)",
      },
    });

  let res = await doFetch(tokens.access_token);
  if (res.status === 401) {
    const refreshed = await refreshAndSave(admin, integration, tokens.refresh_token);
    res = await doFetch(refreshed.access_token);
  }
  return res;
}

/** GET /me — usado só pra validar que o token funciona (conta conectada, saldo, etc). */
export async function fetchMelhorEnvioAccount(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
) {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me");
  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status} ao consultar a conta`);
  }
  return res.json();
}

export interface ShippingCalculateParams {
  originCep: string;
  destinationCep: string;
  /** Gramas — convertido pra kg antes de chamar a API. */
  weightG: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
}

export interface ShippingQuote {
  id: number;
  company: string;
  companyLogo: string | null;
  service: string;
  price: number;
  deliveryDays: number;
}

/** Transportadora que a API retornou mas não devolveu preço (ex: sem contrato habilitado pra essa conta). */
export interface ShippingUnavailable {
  company: string;
  service: string;
  reason: string;
}

export interface ShippingCalculateResult {
  quotes: ShippingQuote[];
  unavailable: ShippingUnavailable[];
}

/**
 * POST /me/shipment/calculate — testado ao vivo contra a conta sandbox já
 * conectada (companies com id 2, "Jadlog", responderam price/delivery_time
 * reais). Sandbox do Melhor Envio só libera cotação real pra algumas
 * transportadoras de teste — Correios normalmente só responde em produção,
 * com contrato habilitado na conta. Entradas com campo `error` (sem
 * contrato/sem preço pra essa conta) não entram em `quotes`, mas voltam em
 * `unavailable` pra dar visibilidade do motivo em vez de sumir silenciosamente.
 */
export async function calculateShipping(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  params: ShippingCalculateParams
): Promise<ShippingCalculateResult> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me/shipment/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { postal_code: params.originCep.replace(/\D/g, "") },
      to: { postal_code: params.destinationCep.replace(/\D/g, "") },
      package: {
        height: params.heightCm,
        width: params.widthCm,
        length: params.lengthCm,
        weight: params.weightG / 1000,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status} ao calcular o frete`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return { quotes: [], unavailable: [] };

  const quotes: ShippingQuote[] = [];
  const unavailable: ShippingUnavailable[] = [];

  for (const item of data) {
    const company = item.company?.name ?? "Transportadora";
    const service = item.name ?? "";
    if (item.error || !item.price) {
      unavailable.push({
        company,
        service,
        reason: typeof item.error === "string" ? item.error : "Indisponível pra essa conta/CEP.",
      });
      continue;
    }
    quotes.push({
      id: item.id,
      company,
      companyLogo: item.company?.picture ?? null,
      service,
      price: Number(item.price),
      deliveryDays: item.delivery_time ?? item.custom_delivery_time ?? 0,
    });
  }

  return { quotes, unavailable };
}
