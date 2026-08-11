import type { QuoteStatus } from "./types";

export const QUOTE_EXPIRY_DAYS = 15;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento Enviado",
  paid: "Pago",
  in_production: "Em Produção",
  shipped: "Pedido Enviado",
  expired: "Expirado",
};

export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["sent", "paid", "in_production", "shipped"];

export function isQuoteSentExpired(status: QuoteStatus, sentAt: string): boolean {
  if (status !== "sent") return false;
  const expiresAt = new Date(sentAt).getTime() + QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export function quoteDaysUntilExpiry(sentAt: string): number {
  const expiresAt = new Date(sentAt).getTime() + QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
}