import { PIX_GRACE_PERIOD_DAYS } from "./plans";

export type PixBillingState = "active" | "grace" | "expired";

/**
 * Estado do pagamento manual via Pix, comparado a `paid_until`:
 * - "active"  → dentro do período pago normalmente
 * - "grace"   → venceu, mas ainda dentro dos dias de tolerância
 * - "expired" → venceu e passou da tolerância — deve ser rebaixado pra Free
 */
export function pixBillingState(paidUntil: string | null | undefined): PixBillingState {
  if (!paidUntil) return "expired";
  const graceEndsAt = new Date(paidUntil).getTime() + PIX_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now <= new Date(paidUntil).getTime()) return "active";
  if (now <= graceEndsAt) return "grace";
  return "expired";
}

/** Dias restantes até `paid_until` (pode ser negativo se já venceu). */
export function pixDaysUntilDue(paidUntil: string | null | undefined): number {
  if (!paidUntil) return 0;
  const diffMs = new Date(paidUntil).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Dias restantes de tolerância (só faz sentido quando o estado é "grace"). */
export function pixGraceDaysLeft(paidUntil: string | null | undefined): number {
  if (!paidUntil) return 0;
  const graceEndsAt = new Date(paidUntil).getTime() + PIX_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((graceEndsAt - Date.now()) / (1000 * 60 * 60 * 24)));
}