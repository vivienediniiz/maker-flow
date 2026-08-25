import { CreditCard, ShoppingCart, ShoppingBag, Video, Store, Globe, type LucideIcon } from "lucide-react";
import type { QuoteStatus, QuoteSource, QuotePaymentMethod } from "./types";

export const QUOTE_EXPIRY_DAYS = 15;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento Enviado",
  paid: "Pago",
  in_production: "Em Produção",
  shipped: "Pedido Enviado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

// Rótulos curtos, usados embaixo de cada bolinha da barra de status.
export const QUOTE_STATUS_SHORT_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento",
  paid: "Pago",
  in_production: "Produção",
  shipped: "Enviado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["sent", "paid", "in_production", "shipped"];

export const QUOTE_STATUS_PILL_STYLES: Record<QuoteStatus, string> = {
  sent: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  paid: "bg-neon-green/15 text-neon-green border-neon-green/30",
  in_production: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  shipped: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function formatOrderNumber(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export const QUOTE_PAYMENT_METHOD_LABELS: Record<QuotePaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
  payment_link: "Link de Pagamento",
};

export const QUOTE_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  presencial: "Presencial",
  marketplaces: "Marketplaces",
};

export const QUOTE_SOURCE_LABELS: Record<QuoteSource, string> = {
  mercado_pago: "Mercado Pago",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  manual: "Manual",
  loja_online: "Loja Online",
};

export const QUOTE_SOURCE_ICONS: Record<QuoteSource, LucideIcon> = {
  mercado_pago: CreditCard,
  mercado_livre: ShoppingCart,
  shopee: ShoppingBag,
  tiktok_shop: Video,
  manual: Store,
  loja_online: Globe,
};

// Cores reais de cada marca (não são tokens do design system — hex direto
// da identidade visual de cada plataforma). "Manual" não é uma marca, fica neutro.
// "Loja Online" usa o rosa neon da própria marca StudioMaker, já que é um canal
// nosso, não de terceiros.
export const QUOTE_SOURCE_BADGE_STYLES: Record<QuoteSource, string> = {
  mercado_pago: "bg-[#00B1EA]/15 text-[#00B1EA] border-[#00B1EA]/30",
  mercado_livre: "bg-[#FFE600]/15 text-[#FFE600] border-[#FFE600]/40",
  shopee: "bg-[#EE4D2D]/15 text-[#EE4D2D] border-[#EE4D2D]/30",
  tiktok_shop: "bg-[#FE2C55]/15 text-[#FE2C55] border-[#FE2C55]/30",
  manual: "bg-white/10 text-text-secondary border-white/10",
  loja_online: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
};

/** Próximo estágio no fluxo linear (sent → paid → in_production → shipped), com o rótulo do botão de ação rápida. */
export function nextQuoteAction(status: QuoteStatus): { next: QuoteStatus; label: string } | null {
  const order: QuoteStatus[] = ["sent", "paid", "in_production", "shipped"];
  const actionLabels: Record<QuoteStatus, string> = {
    sent: "Marcar como Pago",
    paid: "Iniciar Produção",
    in_production: "Marcar Enviado",
    shipped: "",
    expired: "Reabrir",
    cancelled: "",
  };
  if (status === "expired") return { next: "sent", label: actionLabels.expired };
  if (status === "cancelled") return null;
  const idx = order.indexOf(status);
  if (idx === -1 || idx === order.length - 1) return null;
  const next = order[idx + 1];
  return { next, label: actionLabels[status] };
}

/** Um orçamento "sent" vence 15 dias depois de enviado, se ninguém avançar o status. */
export function isQuoteSentExpired(status: QuoteStatus, sentAt: string): boolean {
  if (status !== "sent") return false;
  const expiresAt = new Date(sentAt).getTime() + QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

/** Dias restantes até o orçamento vencer (só relevante enquanto status === "sent"). */
export function quoteDaysUntilExpiry(sentAt: string): number {
  const expiresAt = new Date(sentAt).getTime() + QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

/** A partir de quantos dias de antecedência o prazo de produção conta como "vencendo" (inclui já vencido, dias negativos). */
export const PRODUCTION_DEADLINE_WARNING_DAYS = 2;

/** Dias até `production_deadline_date` — negativo se já passou. Parseia como data local (evita o off-by-one de `new Date("yyyy-mm-dd")`, que o JS lê como UTC). */
export function daysUntilProductionDeadline(deadlineDate: string): number {
  const deadline = new Date(`${deadlineDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** true quando a venda tem prazo de produção cadastrado, ainda não foi enviada/cancelada/expirada, e o prazo está a poucos dias (ou já vencido). */
export function isProductionDeadlineDue(status: QuoteStatus, deadlineDate: string | null): boolean {
  if (!deadlineDate) return false;
  if (status === "shipped" || status === "cancelled" || status === "expired") return false;
  return daysUntilProductionDeadline(deadlineDate) <= PRODUCTION_DEADLINE_WARNING_DAYS;
}