/**
 * Integração InfinitePay — segunda forma de pagamento da Loja Online, só
 * habilitada pra loja configurada em NEXT_PUBLIC_INFINITEPAY_STORE_SLUG
 * (hoje, "studio-diniz"). Diferente do Mercado Pago, não há OAuth por
 * vendedor: a autenticação é só a InfiniteTag (handle), que a própria
 * documentação da InfinitePay trata como não-secreta.
 *
 * IMPORTANTE: a documentação oficial não menciona verificação de
 * assinatura (HMAC) no webhook, então NUNCA confie no corpo do webhook
 * sozinho pra marcar um pedido como pago — sempre confirme via
 * `checkInfinitePayPayment` (endpoint payment_check) antes.
 */

const INFINITEPAY_BASE_URL = "https://api.checkout.infinitepay.io";

/**
 * Carrega o status HTTP e o corpo da resposta pra quem chamou poder
 * distinguir "o InfinitePay recusou os dados" (4xx, culpa do payload — ex.
 * valor abaixo do mínimo aceito) de "o InfinitePay caiu" (5xx/rede), que
 * pedem mensagens diferentes pro usuário.
 */
export class InfinitePayError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(action: string, status: number, body: unknown) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    super(`InfinitePay respondeu ${status} ao ${action}: ${detail}`);
    this.name = "InfinitePayError";
    this.status = status;
    this.body = detail;
  }

  /** 4xx = payload recusado; dá pra orientar o usuário. 5xx = tentar de novo. */
  get isRejected() {
    return this.status >= 400 && this.status < 500;
  }
}

export interface InfinitePayItem {
  quantity: number;
  /** Em centavos — R$ 49,90 = 4990. */
  price: number;
  description: string;
}

export interface InfinitePayCustomer {
  name?: string;
  email?: string;
  phone_number?: string;
}

export interface InfinitePayLinkRequest {
  handle: string;
  items: InfinitePayItem[];
  order_nsu: string;
  redirect_url?: string;
  webhook_url?: string;
  customer?: InfinitePayCustomer;
}

interface InfinitePayLinkResponse {
  url: string;
  [key: string]: unknown;
}

export async function createInfinitePayCheckoutLink(body: InfinitePayLinkRequest): Promise<InfinitePayLinkResponse> {
  const res = await fetch(`${INFINITEPAY_BASE_URL}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    throw new InfinitePayError("criar o link de pagamento", res.status, data);
  }
  return data as InfinitePayLinkResponse;
}

export interface InfinitePayCheckRequest {
  handle: string;
  order_nsu: string;
  transaction_nsu: string;
  slug: string;
}

export interface InfinitePayCheckResponse {
  success: boolean;
  paid: boolean;
  amount?: number;
  paid_amount?: number;
  capture_method?: string;
  receipt_url?: string;
  [key: string]: unknown;
}

/** Segunda checagem obrigatória — nunca confiar só no payload do webhook (ver aviso no topo do arquivo). */
export async function checkInfinitePayPayment(body: InfinitePayCheckRequest): Promise<InfinitePayCheckResponse> {
  const res = await fetch(`${INFINITEPAY_BASE_URL}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new InfinitePayError("checar o pagamento", res.status, data);
  }
  return data as InfinitePayCheckResponse;
}
