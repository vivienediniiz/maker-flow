import { getCyclePricing, TRIAL_TIER, type PlanTier, type BillingCycle } from "./plans";
import type { SubscriptionTier, SubscriptionStatus } from "./types";

/**
 * As decisões do webhook do Mercado Pago, isoladas da rota.
 *
 * Isso mora aqui, e não dentro de app/api/webhooks/mercadopago/route.ts, por
 * um motivo prático: os três bugs de assinatura que apareceram em produção
 * (preapproval "pending" rebaixando o plano, aviso atrasado derrubando quem já
 * pagou, e Pix duplicado somando período de novo) foram todos erros de decisão,
 * não de I/O. Como função pura, cada um vira um teste de uma linha; dentro da
 * rota, exigiria simular Mercado Pago e Supabase pra chegar no mesmo lugar.
 *
 * A rota fica responsável só por buscar o recurso, ler o perfil e aplicar o
 * que estas funções decidirem.
 */

export const MP_STATUS_TO_SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus> = {
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
  pending: "inactive",
};

/** O que a rota já leu do perfil antes de decidir. */
export interface ProfileSnapshot {
  mp_subscription_id?: string | null;
  trial_ends_at?: string | null;
  paid_until?: string | null;
  last_pix_payment_id?: string | null;
}

export interface PreapprovalUpdate {
  subscription_tier: SubscriptionTier;
  billing_cycle: BillingCycle | null;
  subscription_status: SubscriptionStatus;
  payment_method: "card" | null;
  paid_until: null;
  mp_subscription_id: string;
}

export interface PixUpdate {
  subscription_tier: SubscriptionTier;
  billing_cycle: BillingCycle;
  subscription_status: SubscriptionStatus;
  payment_method: "pix";
  paid_until: string;
  last_pix_payment_id: string;
}

export type PreapprovalSkipReason = "preapproval_pending" | "stale_preapproval";

export type Decision<TUpdate, TReason extends string> =
  | { action: "skip"; reason: TReason }
  | { action: "apply"; update: TUpdate };

function isInTrial(trialEndsAt: string | null | undefined, now: number): boolean {
  if (!trialEndsAt) return false;
  const endsAt = new Date(trialEndsAt).getTime();
  return Number.isFinite(endsAt) && endsAt > now;
}

/**
 * Assinatura recorrente por cartão (preapproval).
 *
 * O aviso do Mercado Pago não é um comando — é um estado. Nem todo estado
 * diferente de "authorized" significa rebaixar alguém.
 */
export function decidePreapproval({
  mpStatus,
  preapprovalId,
  tier,
  cycle,
  profile,
  now = Date.now(),
}: {
  mpStatus: string;
  preapprovalId: string;
  tier: PlanTier;
  cycle: BillingCycle;
  profile: ProfileSnapshot | null;
  now?: number;
}): Decision<PreapprovalUpdate, PreapprovalSkipReason> {
  const subscriptionStatus = MP_STATUS_TO_SUBSCRIPTION_STATUS[mpStatus] ?? "inactive";
  const isEffectivelyActive = subscriptionStatus === "active";

  if (!isEffectivelyActive) {
    // "pending" é o estado em que /api/mercadopago/create-preapproval cria a
    // assinatura: o usuário clicou em "Assinar" e ainda nem chegou no checkout.
    // O MP avisa nesse instante. Escrever no perfil aqui rebaixava pra Free
    // quem só clicou no botão — inclusive matando o trial de uma conta nova.
    if (mpStatus === "pending") {
      return { action: "skip", reason: "preapproval_pending" };
    }

    // Cancelamento/pausa só vale pra assinatura que é a atual do perfil. Sem
    // isso, o aviso atrasado de uma tentativa abandonada derrubava um
    // assinante que já tinha pago em outra tentativa.
    if (profile?.mp_subscription_id && profile.mp_subscription_id !== preapprovalId) {
      return { action: "skip", reason: "stale_preapproval" };
    }
  }

  // Assinatura que não vingou não pode custar o trial de quem ainda está
  // dentro do prazo — volta pro tier do trial, não pro Free.
  const fallbackTier: SubscriptionTier = isInTrial(profile?.trial_ends_at, now) ? TRIAL_TIER : "free";

  return {
    action: "apply",
    update: {
      subscription_tier: isEffectivelyActive ? tier : fallbackTier,
      billing_cycle: isEffectivelyActive ? cycle : null,
      subscription_status: subscriptionStatus,
      payment_method: isEffectivelyActive ? "card" : null,
      paid_until: null,
      mp_subscription_id: preapprovalId,
    },
  };
}

/**
 * Pagamento Pix avulso aprovado (renovação manual).
 *
 * Só é chamada pra pagamento já aprovado — o filtro de status fica na rota.
 */
export function decidePixPayment({
  paymentId,
  tier,
  cycle,
  profile,
  now = Date.now(),
}: {
  paymentId: string;
  tier: PlanTier;
  cycle: BillingCycle;
  profile: ProfileSnapshot | null;
  now?: number;
}): Decision<PixUpdate, "pix_already_credited"> {
  // O Mercado Pago reenvia o aviso do mesmo pagamento (retry, ou o mesmo
  // evento chegando por dois canais). Sem esta trava, cada reenvio somava
  // outro período inteiro em paid_until — assinatura de graça.
  if (profile?.last_pix_payment_id === paymentId) {
    return { action: "skip", reason: "pix_already_credited" };
  }

  const periodDays = getCyclePricing(tier, cycle).frequencyMonths * 30;

  // Renovação paga antes de vencer soma em cima do que ainda sobrava, em vez
  // de queimar os dias restantes.
  const currentPaidUntil = profile?.paid_until ? new Date(profile.paid_until).getTime() : 0;
  const startsFrom = Number.isFinite(currentPaidUntil) ? Math.max(now, currentPaidUntil) : now;

  return {
    action: "apply",
    update: {
      subscription_tier: tier,
      billing_cycle: cycle,
      subscription_status: "active",
      payment_method: "pix",
      paid_until: new Date(startsFrom + periodDays * 24 * 60 * 60 * 1000).toISOString(),
      last_pix_payment_id: paymentId,
    },
  };
}
