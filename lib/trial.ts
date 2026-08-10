/**
 * Utilitários para o período gratuito de 7 dias.
 * A data-limite (`trial_ends_at`) é definida no Supabase, no momento do signup
 * (default da coluna em profiles: now() + interval '7 days').
 */

export function trialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(trialEndsAt: string | null | undefined): boolean {
  return trialDaysRemaining(trialEndsAt) <= 0;
}