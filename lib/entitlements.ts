import type { SubscriptionTier } from "./types";

export const FREE_LIMITS = {
  clients: 10,
  products: 10,
  filaments: 5,
  branches: 1,
} as const;

export type LimitedResource = keyof typeof FREE_LIMITS;

export function isPaid(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function limitFor(tier: SubscriptionTier, resource: LimitedResource): number {
  return isPaid(tier) ? Infinity : FREE_LIMITS[resource];
}

export function canCreateMore(tier: SubscriptionTier, resource: LimitedResource, currentCount: number): boolean {
  return currentCount < limitFor(tier, resource);
}

/**
 * Todo o resto (PDF, integrações, Financeiro, Insights, Insumos/Compras
 * Extras, Suporte via WhatsApp, baixa automática de estoque, alerta de
 * estoque baixo, Dashboard completo) segue a mesma regra simples: liberado
 * pra quem é pago, bloqueado pra quem é Free. Não precisa de matriz por
 * feature — só isPaid(tier) — mas fica como função nomeada pra deixar
 * explícito nos componentes o que está sendo checado.
 */
export function hasFeature(tier: SubscriptionTier): boolean {
  return isPaid(tier);
}
