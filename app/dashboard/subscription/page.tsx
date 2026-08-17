"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { BillingToggle } from "@/components/marketing/BillingToggle";
import { PlanCard } from "@/components/marketing/PlanCard";
import { PixCheckoutModal } from "@/components/marketing/PixCheckoutModal";
import { createClient } from "@/lib/supabase/client";
import { PLANS, getPlan, priceFor, planDisplayLabel, type BillingCycle, type PlanId } from "@/lib/plans";
import { trialDaysRemaining } from "@/lib/trial";
import { pixBillingState, pixDaysUntilDue } from "@/lib/pix";
import { Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";

export default function SubscriptionPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pixTarget, setPixTarget] = useState<PlanId | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data as Profile);
    if (data?.billing_cycle) setCycle(data.billing_cycle as BillingCycle);
    setLoading(false);
  }

  async function handleSubscribeCard(planId: PlanId) {
    setError(null);
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/mercadopago/create-preapproval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o checkout.");
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setError("Erro de rede ao contatar o Mercado Pago.");
      setLoadingPlan(null);
    }
  }

  function handlePixApproved() {
    setTimeout(loadProfile, 1500);
  }

  if (loading) {
    return (
      <>
        <Topbar title="Assinatura" />
        <main className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </main>
      </>
    );
  }

  const tier = profile?.subscription_tier ?? "free";
  const isPix = profile?.payment_method === "pix";
  const pixState = isPix ? pixBillingState(profile?.paid_until) : null;

  return (
    <>
      <Topbar title="Assinatura" />
      <main className="space-y-8 px-6 py-8 md:px-8">
        <GlassCard padding="lg" className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-text-muted">Plano atual</p>
          <p className="font-display text-2xl">{planDisplayLabel(tier, profile?.billing_cycle ?? null)}</p>
          {tier === "free" ? (
            <p className="text-sm text-text-secondary">
              {trialDaysRemaining(profile?.trial_ends_at) > 0
                ? `${trialDaysRemaining(profile?.trial_ends_at)} ${trialDaysRemaining(profile?.trial_ends_at) === 1 ? "dia restante" : "dias restantes"} do período gratuito.`
                : "Seu período gratuito acabou — assine um plano abaixo para continuar."}
            </p>
          ) : isPix ? (
            <p className="text-sm text-text-secondary">
              Pagamento via Pix (manual) ·{" "}
              {pixState === "active"
                ? `renova em ${pixDaysUntilDue(profile?.paid_until)} dias`
                : pixState === "grace"
                  ? "vencido, dentro do prazo de tolerância — renove para não perder o acesso"
                  : "vencido"}
            </p>
          ) : (
            <p className="text-sm text-text-secondary">Cobrança automática via cartão (Mercado Pago).</p>
          )}
        </GlassCard>

        <div>
          <h2 className="mb-4 font-display text-xl">Trocar de plano</h2>
          <div className="flex justify-center">
            <BillingToggle value={cycle} onChange={setCycle} />
          </div>

          {error && <p className="mx-auto mt-4 max-w-md text-center text-sm text-red-400">{error}</p>}

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                loading={loadingPlan === plan.id}
                onSubscribeCard={() => handleSubscribeCard(plan.id)}
                onPayPix={() => setPixTarget(plan.id)}
              />
            ))}
          </div>
        </div>
      </main>

      {pixTarget && (
        <PixCheckoutModal
          open={!!pixTarget}
          onClose={() => setPixTarget(null)}
          planId={pixTarget}
          planName={getPlan(pixTarget).name}
          cycle={cycle}
          amount={priceFor(getPlan(pixTarget), cycle)}
          onApproved={handlePixApproved}
        />
      )}
    </>
  );
}
