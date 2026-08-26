import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationCredential, setIntegrationCredential } from "@/lib/vault";

// Escopos cobrindo cotação, carrinho, compra, geração e impressão de
// etiqueta, além de rastreio — precisam estar habilitados no cadastro do
// app no painel do Melhor Envio, senão a autorização é rejeitada com
// "invalid_scope". "shipping-cart" não existe como escopo (causou o erro);
// o nome correto pra adicionar/ler o carrinho é cart-write/cart-read.
// "users-read" é o que libera GET /me (dados da conta, incluindo saldo da
// carteira) — sem ele a chamada authentica normalmente mas volta 403 nesse
// endpoint específico. Faltava aqui; qualquer integração já conectada
// ANTES dessa mudança precisa desconectar e reconectar pra ganhar esse
// escopo (o token antigo não pode simplesmente "adquirir" permissão nova).
const OAUTH_SCOPES =
  "shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking cart-read cart-write users-read";

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

/**
 * Saldo da carteira Melhor Envio — não fica em GET /me diretamente, e sim
 * dentro do array `accounts[].available_limit` (saldo já descontando o que
 * está reservado; cai pra `balance` se por algum motivo faltar). Confirmado
 * contra payload real de GET /me (sandbox): `accounts: [{ balance: "10000",
 * reserved: "0", available_limit: "10000", ... }]` — soma todas as contas
 * do array, caso existam mais de uma.
 */
export async function fetchMelhorEnvioBalance(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null }
): Promise<number> {
  const account = await fetchMelhorEnvioAccount(admin, integration);
  const accounts: Array<{ balance?: string; available_limit?: string }> = Array.isArray(account?.accounts)
    ? account.accounts
    : [];

  if (accounts.length === 0) {
    throw new Error('Não foi possível ler o saldo da carteira Melhor Envio (payload de GET /me sem "accounts").');
  }

  const balance = accounts.reduce((sum, acc) => sum + (Number(acc.available_limit ?? acc.balance) || 0), 0);
  if (!Number.isFinite(balance)) {
    throw new Error("Não foi possível ler o saldo da carteira Melhor Envio (formato de resposta inesperado).");
  }
  return balance;
}

export interface MelhorEnvioParty {
  name: string;
  phone?: string;
  document?: string;
  company_document?: string;
  address: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
  country_id?: string;
}

export interface AddToCartParams {
  serviceId: number;
  from: MelhorEnvioParty;
  to: MelhorEnvioParty;
  productName: string;
  productValue: number;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
}

export interface MelhorEnvioCartItem {
  id: string;
  protocol: string;
  price: number;
  status: string;
}

/** POST /me/cart — adiciona 1 frete ao carrinho. `id` retornado é o que identifica esse envio em todas as chamadas seguintes (checkout/generate/print). */
export async function addToMelhorEnvioCart(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  params: AddToCartParams
): Promise<MelhorEnvioCartItem> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service: params.serviceId,
      from: { ...params.from, country_id: params.from.country_id ?? "BR" },
      to: { ...params.to, country_id: params.to.country_id ?? "BR" },
      products: [{ name: params.productName, quantity: "1", unitary_value: params.productValue.toFixed(2) }],
      volumes: [{ height: params.heightCm, width: params.widthCm, length: params.lengthCm, weight: params.weightKg }],
      options: { insurance_value: params.productValue, non_commercial: true },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.errors ? JSON.stringify(body.errors) : body?.message;
    throw new Error(`Melhor Envio respondeu ${res.status} ao adicionar ao carrinho${detail ? `: ${detail}` : ""}`);
  }

  const data = await res.json();
  return { id: data.id, protocol: data.protocol, price: Number(data.price ?? data.quote), status: data.status };
}

/**
 * POST /me/shipment/checkout — debita da carteira Melhor Envio. Manda só
 * este `orderId` no array `orders` (nunca em lote com outros pedidos), pra
 * cada compra continuar sendo uma decisão isolada por venda.
 */
export async function checkoutMelhorEnvioCart(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<{ status: string }> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me/shipment/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders: [orderId] }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Melhor Envio respondeu ${res.status} ao comprar o frete${body?.message ? `: ${body.message}` : ""}`);
  }

  const data = await res.json();
  return { status: data?.purchase?.status ?? "unknown" };
}

/** POST /me/shipment/generate — não devolve código de rastreio (confirmar contra payload real); só confirma que a transportadora foi notificada. */
export async function generateMelhorEnvioLabel(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<void> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me/shipment/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders: [orderId] }),
  });

  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status} ao gerar a etiqueta`);
  }

  const data = await res.json();
  const result = data?.[orderId];
  if (result && result.status !== true) {
    throw new Error(result.message ?? "Falha ao gerar a etiqueta.");
  }
}

/** GET /me/cart/{id} — usado depois de gerar, só pra tentar capturar o código de rastreio (`tracking`) se a transportadora já tiver disponibilizado; pode vir null ainda (só aparece quando o envio é postado). */
export async function fetchMelhorEnvioCartItem(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<{ status: string; tracking: string | null }> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, `/me/cart/${orderId}`);
  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status} ao consultar o envio`);
  }
  const data = await res.json();
  return { status: data.status, tracking: data.tracking ?? null };
}

/**
 * POST /me/shipment/print — única forma de impressão confirmada contra a
 * doc oficial (o endpoint GET /me/imprimir/{formato}/{id}, que prometia URL
 * direta por formato, voltou 422 num teste real — abandonado). Não tem
 * parâmetro de formato: devolve uma única URL (a interface de impressão do
 * Melhor Envio, que deve trazer as opções PDF/ZPL dentro dela). `mode:
 * "public"` evita exigir login na conta Melhor Envio pra abrir o link.
 */
export async function printMelhorEnvioLabel(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<string> {
  const res = await melhorEnvioFetchForIntegration(admin, integration, "/me/shipment/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders: [orderId], mode: "public" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.errors ? JSON.stringify(body.errors) : body?.message;
    throw new Error(`Melhor Envio respondeu ${res.status} ao buscar o link de impressão${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  const url = typeof data === "string" ? data : data?.url;
  if (!url || typeof url !== "string") {
    throw new Error("Melhor Envio não devolveu uma URL de impressão válida.");
  }
  return url;
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

interface OriginProfile {
  studio_name: string | null;
  full_name: string;
  phone: string | null;
  document: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

interface DestinationClient {
  name: string;
  phone: string | null;
  document: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

function documentField(document: string | null): { document?: string; company_document?: string } {
  const digits = (document ?? "").replace(/\D/g, "");
  if (digits.length === 14) return { company_document: digits };
  if (digits.length === 11) return { document: digits };
  return {};
}

/**
 * Monta os objetos `from`/`to` exigidos pelo POST /me/cart e valida que
 * nenhum campo obrigatório está faltando ANTES de qualquer chamada à API —
 * "endereço incompleto" precisa ser um erro nosso, claro, não um 422 da
 * Melhor Envio no meio do fluxo de compra.
 */
export function buildShippingParties(
  origin: OriginProfile,
  destination: DestinationClient
): { from: MelhorEnvioParty; to: MelhorEnvioParty } | { missing: string[] } {
  const missing: string[] = [];

  if (!origin.street) missing.push("Rua do remetente (Perfil do Estúdio)");
  if (!origin.street_number) missing.push("Número do remetente (Perfil do Estúdio)");
  if (!origin.neighborhood) missing.push("Bairro do remetente (Perfil do Estúdio)");
  if (!origin.city) missing.push("Cidade do remetente (Perfil do Estúdio)");
  if (!origin.state) missing.push("Estado do remetente (Perfil do Estúdio)");
  if (!origin.cep) missing.push("CEP do remetente (Perfil do Estúdio)");
  if (!origin.document) missing.push("CPF/CNPJ do remetente (Perfil do Estúdio)");
  if (!origin.phone) missing.push("Telefone do remetente (Perfil do Estúdio)");

  if (!destination.street) missing.push("Rua do cliente");
  if (!destination.number) missing.push("Número do cliente");
  if (!destination.neighborhood) missing.push("Bairro do cliente");
  if (!destination.city) missing.push("Cidade do cliente");
  if (!destination.state) missing.push("Estado do cliente");
  if (!destination.cep) missing.push("CEP do cliente");
  if (!destination.document) missing.push("CPF/CNPJ do cliente");
  if (!destination.phone) missing.push("Telefone do cliente");

  if (missing.length > 0) return { missing };

  return {
    from: {
      name: origin.studio_name || origin.full_name,
      phone: origin.phone!.replace(/\D/g, ""),
      ...documentField(origin.document),
      address: origin.street!,
      number: origin.street_number!,
      complement: origin.complement ?? undefined,
      district: origin.neighborhood!,
      city: origin.city!,
      state_abbr: origin.state!,
      postal_code: origin.cep!.replace(/\D/g, ""),
    },
    to: {
      name: destination.name,
      phone: destination.phone!.replace(/\D/g, ""),
      ...documentField(destination.document),
      address: destination.street!,
      number: destination.number!,
      complement: destination.complement ?? undefined,
      district: destination.neighborhood!,
      city: destination.city!,
      state_abbr: destination.state!,
      postal_code: destination.cep!.replace(/\D/g, ""),
    },
  };
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
