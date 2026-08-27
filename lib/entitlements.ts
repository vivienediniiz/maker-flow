import type { SubscriptionTier } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const TIER_LIMITS: Record<
  SubscriptionTier,
  { clients: number; products: number; filaments: number; branches: number; printers: number; quotesPerMonth: number }
> = {
  free: { clients: 15, products: 10, filaments: 5, branches: 1, printers: 1, quotesPerMonth: 5 },
  starter: { clients: 300, products: 150, filaments: 40, branches: 5, printers: 5, quotesPerMonth: 50 },
  pro: {
    clients: Infinity,
    products: Infinity,
    filaments: Infinity,
    branches: Infinity,
    printers: Infinity,
    quotesPerMonth: Infinity,
  },
} as const;

export type LimitedResource = keyof (typeof TIER_LIMITS)["free"];

export function isPaid(tier: SubscriptionTier): boolean {
  return tier !== "free";
}

export function limitFor(tier: SubscriptionTier, resource: LimitedResource): number {
  return TIER_LIMITS[tier][resource];
}

export function canCreateMore(tier: SubscriptionTier, resource: LimitedResource, currentCount: number): boolean {
  return currentCount < limitFor(tier, resource);
}

/**
 * Conta quantas quotes (orçamentos + vendas manuais, mesma tabela) o usuário
 * criou no mês corrente — usado pra aplicar o limite `quotesPerMonth`. É
 * assíncrono (precisa de uma contagem ao vivo no banco), diferente de
 * `canCreateMore`, que opera sobre uma contagem já carregada em memória.
 */
export async function getMonthlyQuoteCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", monthStart)
    .lt("sent_at", monthEnd);

  return count ?? 0;
}

export function canCreateMoreQuotes(tier: SubscriptionTier, currentMonthlyCount: number): boolean {
  return currentMonthlyCount < limitFor(tier, "quotesPerMonth");
}
