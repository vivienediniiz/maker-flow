/**
 * Regras de valor do checkout da Loja Online — Pix direto (com desconto) e
 * entrega configurável. Fica fora da rota pra ser testável e reaproveitada:
 * o servidor é quem manda no preço, o navegador só mostra o mesmo cálculo.
 */

export interface ShippingOption {
  id: string;
  label: string;
  /** R$ cobrados do cliente por essa opção. */
  price: number;
  note?: string | null;
}

/** Configuração pública de entrega de uma loja (vem de `store_profiles_public`). */
export interface StoreDeliveryConfig {
  pickup_enabled: boolean;
  pickup_address: string | null;
  arrange_enabled: boolean;
  arrange_note: string | null;
  shipping_options: ShippingOption[];
}

export type DeliveryChoice = { type: "pickup" } | { type: "arrange" } | { type: "shipping"; optionId: string };

export interface ResolvedDelivery {
  method: "pickup" | "arrange" | "shipping";
  label: string;
  amount: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Lê o JSON de opções de frete salvo pelo lojista, descartando linhas inválidas (preço negativo, sem nome). */
export function parseShippingOptions(raw: unknown): ShippingOption[] {
  if (!Array.isArray(raw)) return [];
  const options: ShippingOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const { id, label, price, note } = row as Record<string, unknown>;
    const cleanLabel = typeof label === "string" ? label.trim().slice(0, 60) : "";
    const cleanPrice = Number(price);
    if (!cleanLabel || !Number.isFinite(cleanPrice) || cleanPrice < 0) continue;
    options.push({
      id: typeof id === "string" && id ? id : `opt-${options.length + 1}`,
      label: cleanLabel,
      price: round2(cleanPrice),
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : null,
    });
  }
  return options.slice(0, 6);
}

/** Opções que o cliente pode escolher hoje nessa loja, já com rótulo pronto pra exibir. */
export function listDeliveryChoices(config: StoreDeliveryConfig): { choice: DeliveryChoice; label: string; amount: number; note: string | null }[] {
  const out: { choice: DeliveryChoice; label: string; amount: number; note: string | null }[] = [];
  if (config.pickup_enabled) {
    out.push({ choice: { type: "pickup" }, label: "Retirar no ateliê", amount: 0, note: config.pickup_address });
  }
  for (const option of config.shipping_options) {
    out.push({ choice: { type: "shipping", optionId: option.id }, label: option.label, amount: option.price, note: option.note ?? null });
  }
  if (config.arrange_enabled) {
    out.push({ choice: { type: "arrange" }, label: "Combinar entrega com a loja", amount: 0, note: config.arrange_note });
  }
  return out;
}

/** Valida a escolha do cliente contra o que a loja oferece; devolve null se a opção não existe (ou não está ativa). */
export function resolveDelivery(config: StoreDeliveryConfig, choice: DeliveryChoice): ResolvedDelivery | null {
  if (choice.type === "pickup") {
    return config.pickup_enabled ? { method: "pickup", label: "Retirar no ateliê", amount: 0 } : null;
  }
  if (choice.type === "arrange") {
    return config.arrange_enabled ? { method: "arrange", label: "Combinar entrega com a loja", amount: 0 } : null;
  }
  const option = config.shipping_options.find((o) => o.id === choice.optionId);
  return option ? { method: "shipping", label: option.label, amount: option.price } : null;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

/** Desconto % só vale no Pix direto, e incide só nos produtos (nunca no frete). */
export function computeCheckoutTotals(params: {
  subtotal: number;
  pixDiscountPercent: number;
  isPixDirect: boolean;
  shippingAmount: number;
}): CheckoutTotals {
  const subtotal = round2(Math.max(params.subtotal, 0));
  const percent = Math.min(Math.max(params.pixDiscountPercent || 0, 0), 50);
  const discount = params.isPixDirect ? round2((subtotal * percent) / 100) : 0;
  const shipping = round2(Math.max(params.shippingAmount, 0));
  return { subtotal, discount, shipping, total: round2(subtotal - discount + shipping) };
}

/**
 * Reparte desconto e frete entre as linhas do carrinho (cada produto vira uma
 * venda). Desconto é proporcional ao valor de cada item; o frete vai inteiro
 * na primeira linha, pra não duplicar a cobrança. A soma das linhas fecha
 * sempre com `total` (a última linha absorve os centavos de arredondamento).
 */
export function allocateCheckoutTotals(
  itemGross: number[],
  totals: Pick<CheckoutTotals, "discount" | "shipping">
): { discount: number; shipping: number; finalPrice: number }[] {
  const gross = itemGross.reduce((s, v) => s + v, 0) || 1;
  let discountLeft = totals.discount;
  return itemGross.map((value, index) => {
    const isLast = index === itemGross.length - 1;
    const discount = isLast ? round2(discountLeft) : round2((totals.discount * value) / gross);
    discountLeft -= discount;
    const shipping = index === 0 ? totals.shipping : 0;
    return { discount, shipping, finalPrice: round2(value - discount + shipping) };
  });
}

/** Etapas do acompanhamento público do pedido, na ordem. */
export const TRACKING_STEPS = ["Aguardando pagamento", "Pagamento confirmado", "Em produção", "Enviado"] as const;

/** Etapa (0..3) de um pedido a partir do status das vendas ligadas a ele; "cancelled" se alguma foi cancelada/expirou. */
export function trackingStage(statuses: string[]): number | "cancelled" {
  if (statuses.length === 0) return 0;
  if (statuses.some((s) => s === "cancelled" || s === "expired")) return "cancelled";
  const order: Record<string, number> = { sent: 0, awaiting_payment: 0, paid: 1, in_production: 2, shipped: 3 };
  return Math.min(...statuses.map((s) => order[s] ?? 0));
}
