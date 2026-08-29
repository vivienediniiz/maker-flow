"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { PlanCard } from "@/components/marketing/PlanCard";
import { PlanComparisonTable } from "@/components/marketing/PlanComparisonTable";
import { PixCheckoutModal } from "@/components/marketing/PixCheckoutModal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { createClient } from "@/lib/supabase/client";
import { PLANS, getPlan, getCyclePricing, planDisplayLabel, type PlanTier, type BillingCycle } from "@/lib/plans";
import { trialDaysRemaining } from "@/lib/trial";
import { pixBillingState, pixDaysUntilDue } from "@/lib/pix";
import type { Profile } from "@/lib/types";

export default function SubscriptionPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pixTarget, setPixTarget] = useState<PlanTier | null>(null);

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
    setLoading(false);
  }

  async function handleSubscribeCard(tier: PlanTier) {
    setError(null);
    setLoadingPlan(tier);
    try {
      const res = await fetch("/api/mercadopago/create-preapproval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o checkout.");
        setLoadingPlan(null);
        return;
      }
      const checkoutWindow = window.open(data.init_point, "_blank", "noopener,noreferrer");
      if (!checkoutWindow) {
        setError("O navegador bloqueou a aba de pagamento — permita pop-ups pra este site e tente de novo.");
      }
      setLoadingPlan(null);
    } catch {
      setError("Erro de rede ao contatar o Mercado Pago.");
      setLoadingPlan(null);
    }
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
  const isPaying = profile?.subscription_status === "active";
  const daysRemaining = trialDaysRemaining(profile?.trial_ends_at);
  const inTrial = !isPaying && tier !== "free" && daysRemaining > 0;

  return (
    <>
      <Topbar title="Assinatura" />
      <main className="space-y-8 px-6 py-8 md:px-8">
        {inTrial && (
          <GlassCard padding="lg" className="flex items-center gap-4 border-neon-orange/40 bg-neon-orange/5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neon-gradient shadow-neon-glow">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <p className="font-display text-base">Você está no período de teste completo</p>
              <p className="text-sm text-text-secondary">
                Acesso liberado a tudo dos planos pagos por mais{" "}
                <strong className="font-numeric">{daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}</strong> —
                sem custo, sem cartão cadastrado. Assine antes de acabar pra não perder o acesso.
              </p>
            </div>
          </GlassCard>
        )}

        <GlassCard padding="lg" className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-text-muted">Plano atual</p>
          <p className="font-display text-2xl">{planDisplayLabel(tier)}</p>
          {tier === "free" ? (
            <p className="text-sm text-text-secondary">
              Plano gratuito com limites — assine um dos planos abaixo pra desbloquear tudo.
            </p>
          ) : inTrial ? (
            <p className="text-sm text-text-secondary">Em período de teste — ainda não há cobrança ativa.</p>
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
          <h2 className="mb-4 font-display text-xl">{tier === "free" || inTrial ? "Assinar agora" : "Trocar de plano"}</h2>

          {error && <p className="mx-auto mb-4 max-w-md text-center text-sm text-red-400">{error}</p>}

          <div className="mb-6 flex justify-center">
            <SegmentedControl
              value={cycle}
              onChange={setCycle}
              options={[
                { value: "monthly", label: "Mensal" },
                { value: "annual", label: "Anual (-17%)" },
              ]}
            />
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
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

        <div>
          <h2 className="mb-4 font-display text-xl">O que cada plano inclui</h2>
          <PlanComparisonTable />
        </div>
      </main>

      {pixTarget && (
        <PixCheckoutModal
          open={!!pixTarget}
          onClose={() => setPixTarget(null)}
          tier={pixTarget}
          cycle={cycle}
          planName={getPlan(pixTarget).name}
          amount={getCyclePricing(pixTarget, cycle).price}
        />
      )}
    </>
  );
}
