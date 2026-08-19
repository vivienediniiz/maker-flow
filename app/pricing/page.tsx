"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Check, ArrowLeft } from "lucide-react";
import { PLANS, type PlanId, getPlan } from "@/lib/plans";
import { PlanCard } from "@/components/marketing/PlanCard";
import { PlanComparisonTable } from "@/components/marketing/PlanComparisonTable";
import { PixCheckoutModal } from "@/components/marketing/PixCheckoutModal";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pixTarget, setPixTarget] = useState<PlanId | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user));
  }, []);

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
        body: JSON.stringify({ planId }),
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
        <Link href={loggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">StudioMaker</span>
        </Link>
        {loggedIn ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </Link>
        ) : (
          <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary">
            Já tenho conta
          </Link>
        )}
      </header>

      <main className="px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl md:text-5xl">
            Comece grátis, <span className="neon-text">cresça quando fizer sentido</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            14 dias de acesso completo, sem pedir cartão. Depois, continue no plano Grátis pra sempre, ou assine
            Mensal/Trimestral pra manter tudo liberado. Pague por cartão (automático) ou Pix (manual). Cancele
            quando quiser.
          </p>
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-md text-center text-sm text-red-400">{error}</p>
        )}

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          <GlassCard padding="lg" className="flex flex-col gap-6">
            <div>
              <h3 className="font-display text-xl">Grátis</h3>
              <p className="mt-1 text-sm text-text-secondary">Pra sempre, com limites — dá pra testar o essencial.</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-numeric text-4xl font-semibold text-text-primary">R$ 0</span>
            </div>
            <ul className="space-y-3 text-sm">
              {["Até 10 clientes e 10 produtos", "Até 5 rolos de filamento", "1 filial (matriz)", "Vendas manuais"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-neon-green" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-auto rounded-pill border border-border-glassStrong px-6 py-3 text-center text-sm font-semibold hover:bg-white/5">
              Começar grátis
            </Link>
          </GlassCard>

          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              loading={loadingPlan === plan.id}
              onSubscribeCard={() => handleSubscribeCard(plan.id)}
              onPayPix={() => handlePayPix(plan.id)}
            />
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-6 text-center font-display text-2xl">O que cada plano inclui</h2>
          <PlanComparisonTable />
        </div>
      </main>

      {pixTarget && (
        <PixCheckoutModal
          open={!!pixTarget}
          onClose={() => setPixTarget(null)}
          planId={pixTarget}
          planName={getPlan(pixTarget).name}
          amount={getPlan(pixTarget).price}
          onApproved={handlePixApproved}
        />
      )}
    </div>
  );
}
