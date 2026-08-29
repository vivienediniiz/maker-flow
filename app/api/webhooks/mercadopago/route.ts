import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { decodeExternalReference, getCyclePricing, TRIAL_TIER, type PlanTier, type BillingCycle } from "@/lib/plans";
import { AFFILIATE_COMMISSION_RATE } from "@/lib/affiliates";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Comissão de afiliado só na PRIMEIRA cobrança confirmada de cada usuário —
 * nunca em renovações. `first_payment_confirmed_at` é o carimbo que garante
 * isso: só entra aqui uma vez por usuário, então falha aqui nunca deve
 * derrubar o webhook (a assinatura em si já foi confirmada antes de chamar
 * isso), só loga e segue.
 */
async function maybeRecordAffiliateCommission(supabase: SupabaseClient, userId: string, tier: PlanTier, cycle: BillingCycle) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_payment_confirmed_at, referred_by")
      .eq("id", userId)
      .single();

    if (!profile || profile.first_payment_confirmed_at) return;

    await supabase.from("profiles").update({ first_payment_confirmed_at: new Date().toISOString() }).eq("id", userId);

    if (!profile.referred_by) return;

    // % customizada por afiliado (configurada pelo admin) sobrepõe o padrão
    // global quando preenchida.
    const { data: affiliateProfile } = await supabase
      .from("profiles")
      .select("affiliate_commission_rate")
      .eq("id", profile.referred_by)
      .maybeSingle();

    const commissionRate = affiliateProfile?.affiliate_commission_rate ?? AFFILIATE_COMMISSION_RATE;
    const amount = getCyclePricing(tier, cycle).price * commissionRate;
    const { error } = await supabase.from("affiliate_commissions").insert({
      affiliate_user_id: profile.referred_by,
      referred_user_id: userId,
      plan_id: tier,
      amount,
      status: "pending",
    });
    if (error) console.error("[mercadopago webhook] falha ao registrar comissão de afiliado", error);
  } catch (err) {
    console.error("[mercadopago webhook] erro ao processar comissão de afiliado", err);
  }
}

/**
 * Loga toda troca de plano/status pra alimentar o Overview do admin
 * (crescimento/churn mês-a-mês) — sem histórico antes disso, só existia a
 * "foto do agora" em profiles. Nunca derruba o webhook se falhar.
 */
async function logSubscriptionEvent(
  supabase: SupabaseClient,
  userId: string,
  before: { tier: string | null; status: string | null } | null,
  after: { tier: string; status: string }
) {
  try {
    await supabase.from("subscription_events").insert({
      user_id: userId,
      from_tier: before?.tier ?? null,
      from_status: before?.status ?? null,
      to_tier: after.tier,
      to_status: after.status,
    });
  } catch (err) {
    console.error("[mercadopago webhook] falha ao registrar subscription_event", err);
  }
}

const MP_STATUS_TO_SUBSCRIPTION_STATUS: Record<string, "active" | "paused" | "cancelled" | "inactive"> = {
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
  pending: "inactive",
};

/**
 * Mercado Pago envia { type, data: { id } }. Sempre re-consultamos o recurso na API do MP
 * (nunca confiamos só no corpo do POST). Dois fluxos possíveis, identificados pelo `topic`:
 *
 *  - "subscription_preapproval" / "preapproval" → assinatura automática por cartão.
 *    external_reference no formato "userId|tier|cycle|card".
 *
 *  - "payment" → pagamento avulso via Pix (renovação manual).
 *    external_reference no formato "userId|tier|cycle|pix".
 *    Quando aprovado, estende profiles.paid_until em +30 (mensal) ou +360 (anual) dias.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.type ?? req.nextUrl.searchParams.get("topic");
    const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("id");

    if (!topic || !resourceId) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const supabase = adminClient();

    // --- Fluxo 1: assinatura automática por cartão (preapproval) ---
    if (topic === "subscription_preapproval" || topic === "preapproval") {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        return NextResponse.json({ error: "Falha ao consultar Mercado Pago" }, { status: 502 });
      }

      const subscription = await mpRes.json();
      const rawRef: string | undefined = subscription.external_reference;

      if (!rawRef || !rawRef.includes("|")) {
        console.warn("[mercadopago webhook] external_reference ausente ou em formato antigo:", rawRef);
        return NextResponse.json({ received: true, skipped: "unrecognized_reference" }, { status: 200 });
      }

      const { userId, tier, cycle } = decodeExternalReference(rawRef);
      const mpStatus: string = subscription.status;
      const subscriptionStatus = MP_STATUS_TO_SUBSCRIPTION_STATUS[mpStatus] ?? "inactive";
      const isEffectivelyActive = subscriptionStatus === "active";

      const { data: beforeProfile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, mp_subscription_id, trial_ends_at")
        .eq("id", userId)
        .maybeSingle();

      if (!isEffectivelyActive) {
        // "pending" é o estado em que /api/mercadopago/create-preapproval cria
        // a assinatura: o usuário clicou em "Assinar" e ainda nem chegou no
        // checkout. O MP avisa nesse instante. Escrever no perfil aqui
        // rebaixava pra Free quem só clicou no botão — inclusive matando o
        // reverse trial de uma conta recém-criada. Cancelamento e pausa de
        // verdade chegam em outro aviso, com outro status.
        if (mpStatus === "pending") {
          return NextResponse.json({ received: true, skipped: "preapproval_pending" }, { status: 200 });
        }

        // Cancelamento/pausa só vale pra assinatura que é a atual do perfil.
        // Sem isso, o aviso atrasado de uma tentativa de assinatura abandonada
        // derrubava um assinante que já tinha pago em outra tentativa.
        if (beforeProfile?.mp_subscription_id && beforeProfile.mp_subscription_id !== subscription.id) {
          console.warn(
            `[mercadopago webhook] preapproval ${subscription.id} (${mpStatus}) ignorado: perfil ${userId} está na assinatura ${beforeProfile.mp_subscription_id}.`
          );
          return NextResponse.json({ received: true, skipped: "stale_preapproval" }, { status: 200 });
        }
      }

      // Assinatura que não vingou não pode custar o trial de quem ainda está
      // dentro do prazo — volta pro tier do trial, não pro Free.
      const stillInTrial = beforeProfile?.trial_ends_at
        ? new Date(beforeProfile.trial_ends_at).getTime() > Date.now()
        : false;
      const toTier = isEffectivelyActive ? tier : stillInTrial ? TRIAL_TIER : "free";

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: toTier,
          billing_cycle: isEffectivelyActive ? cycle : null,
          subscription_status: subscriptionStatus,
          payment_method: isEffectivelyActive ? "card" : null,
          paid_until: null,
          mp_subscription_id: subscription.id,
        })
        .eq("id", userId);

      if (error) {
        console.error("[mercadopago webhook] falha ao atualizar profile (preapproval)", error);
        return NextResponse.json({ error: "Falha ao sincronizar assinatura" }, { status: 500 });
      }

      await logSubscriptionEvent(
        supabase,
        userId,
        beforeProfile
          ? { tier: beforeProfile.subscription_tier, status: beforeProfile.subscription_status }
          : null,
        { tier: toTier, status: subscriptionStatus }
      );

      if (isEffectivelyActive) {
        await maybeRecordAffiliateCommission(supabase, userId, tier, cycle);
      }
    }

    // --- Fluxo 2: pagamento avulso via Pix (renovação manual) ---
    if (topic === "payment") {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        return NextResponse.json({ error: "Falha ao consultar Mercado Pago" }, { status: 502 });
      }

      const payment = await mpRes.json();
      const rawRef: string | undefined = payment.external_reference;

      if (!rawRef || !rawRef.includes("|")) {
        return NextResponse.json({ received: true, skipped: "unrecognized_reference" }, { status: 200 });
      }

      const { userId, tier, cycle, method } = decodeExternalReference(rawRef);

      if (method !== "pix") {
        return NextResponse.json({ received: true, skipped: "not_pix" }, { status: 200 });
      }

      if (payment.status === "approved") {
        const { data: beforeProfile } = await supabase
          .from("profiles")
          .select("subscription_tier, subscription_status, paid_until, last_pix_payment_id")
          .eq("id", userId)
          .maybeSingle();

        const pixPaymentId = String(payment.id);

        // O Mercado Pago reenvia o aviso do mesmo pagamento (retry, ou o mesmo
        // evento chegando por dois canais). Sem esta trava, cada reenvio somava
        // outro período inteiro em paid_until — assinatura de graça.
        if (beforeProfile?.last_pix_payment_id === pixPaymentId) {
          return NextResponse.json({ received: true, skipped: "pix_already_credited" }, { status: 200 });
        }

        const periodDays = getCyclePricing(tier, cycle).frequencyMonths * 30;

        // Renovação paga antes de vencer soma em cima do que ainda sobrava, em
        // vez de queimar os dias restantes.
        const currentPaidUntil = beforeProfile?.paid_until ? new Date(beforeProfile.paid_until).getTime() : 0;
        const startsFrom = Number.isFinite(currentPaidUntil) ? Math.max(Date.now(), currentPaidUntil) : Date.now();
        const paidUntil = new Date(startsFrom + periodDays * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: tier,
            billing_cycle: cycle,
            subscription_status: "active",
            payment_method: "pix",
            paid_until: paidUntil,
            last_pix_payment_id: pixPaymentId,
          })
          .eq("id", userId);

        if (error) {
          console.error("[mercadopago webhook] falha ao atualizar profile (pix)", error);
          return NextResponse.json({ error: "Falha ao sincronizar pagamento Pix" }, { status: 500 });
        }

        await logSubscriptionEvent(
          supabase,
          userId,
          beforeProfile
            ? { tier: beforeProfile.subscription_tier, status: beforeProfile.subscription_status }
            : null,
          { tier, status: "active" }
        );

        await maybeRecordAffiliateCommission(supabase, userId, tier, cycle);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[mercadopago webhook] erro", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}