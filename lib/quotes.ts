import type { QuoteStatus } from "./types";

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