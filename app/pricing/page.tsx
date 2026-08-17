"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Check } from "lucide-react";
import { PLANS, type BillingCycle, type PlanId, getPlan, priceFor } from "@/lib/plans";
import { BillingToggle } from "@/components/marketing/BillingToggle";
import { PlanCard } from "@/components/marketing/PlanCard";
import { PixCheckoutModal } from "@/components/marketing/PixCheckoutModal";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pixTarget, setPixTarget] = useState<PlanId | null>(null);

  async function requireSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/signup?next=/pricing`);
      return false;
    }
    return true;
  }

  async function handleSubscribeCard(planId: PlanId) {
    setError(null);
    if (!(await requireSession())) return;
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

  async function handlePayPix(planId: PlanId) {
    setError(null);
    if (!(await requireSession())) return;
    setPixTarget(planId);
  }

  function handlePixApproved() {
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">StudioMaker</span>
        </Link>
        <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
          Já tenho conta
        </Link>
      </header>

      <main className="px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl md:text-5xl">
            Planos que crescem <span className="neon-text">com o seu farm</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            Assine automaticamente pelo cartão, ou pague manualmente via Pix a cada ciclo —
            sem depender de cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <BillingToggle value={cycle} onChange={setCycle} />
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-md text-center text-sm text-red-400">{error}</p>
        )}

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              loading={loadingPlan === plan.id}
              onSubscribeCard={() => handleSubscribeCard(plan.id)}
              onPayPix={() => handlePayPix(plan.id)}
            />
          ))}
        </div>

        <GlassCard padding="lg" className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg">Free</p>
            <p className="text-sm text-text-secondary">
              1 impressora, 10 orçamentos/mês, catálogo básico. Ideal pra testar antes de assinar.
            </p>
          </div>
          <Link href="/signup" className="neon-btn">
            Começar grátis
          </Link>
        </GlassCard>

        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-6 text-center font-display text-2xl">Todos os planos incluem</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Dashboard com KPIs em tempo real",
              "Calculadora de orçamentos multi-mesa",
              "Autenticação segura via Supabase",
              "Exportação de dados",
              "Atualizações contínuas",
              "Suporte por e-mail",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Check size={15} className="text-neon-green" /> {f}
              </div>
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
    </div>
  );
}