import type { QuoteStatus, QuoteSource } from "./types";

export const QUOTE_EXPIRY_DAYS = 15;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento Enviado",
  paid: "Pago",
  in_production: "Em Produção",
  shipped: "Pedido Enviado",
  expired: "Expirado",
};

// Rótulos curtos, usados embaixo de cada bolinha da barra de status.
export const QUOTE_STATUS_SHORT_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento",
  paid: "Pago",
  in_production: "Produção",
  shipped: "Enviado",
  expired: "Expirado",
};

export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["sent", "paid", "in_production", "shipped"];

export function formatOrderNumber(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export const QUOTE_CHANNEL_LABELS: Record<string, string> = {
  tiktok: "TikTok Shop",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
};

export const QUOTE_SOURCE_LABELS: Record<QuoteSource, string> = {
  mercado_pago: "Mercado Pago",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  manual: "Manual",
};

export const QUOTE_SOURCE_BADGE_STYLES: Record<QuoteSource, string> = {
  mercado_pago: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  shopee: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  tiktok_shop: "bg-white/15 text-text-primary border-white/30",
  manual: "bg-white/10 text-text-secondary border-white/10",
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
  };
  if (status === "expired") return { next: "sent", label: actionLabels.expired };
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