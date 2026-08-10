"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Check } from "lucide-react";
import { PLANS, type BillingCycle, type PlanId } from "@/lib/plans";
import { BillingToggle } from "@/components/marketing/BillingToggle";
import { PlanCard } from "@/components/marketing/PlanCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(planId: PlanId) {
    setError(null);
    setLoadingPlan(planId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/signup?next=/pricing`);
      return;
    }

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

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">MakerFlow</span>
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
            Comece grátis, evolua para Starter, Pro ou Studio conforme sua operação escala.
            Cancele quando quiser, sem contrato de fidelidade.
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
              onSubscribe={() => handleSubscribe(plan.id)}
            />
          ))}
        </div>

        {/* Free tier callout */}
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

        {/* Comparison note */}
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
    </div>
  );
}
