import Link from "next/link";
import { Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trialDaysRemaining } from "@/lib/trial";
import type { SubscriptionTier, SubscriptionStatus } from "@/lib/types";

export function TrialBanner({
  tier,
  subscriptionStatus,
  trialEndsAt,
}: {
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
}) {
  // Assinante pagando de verdade — sem banner.
  if (subscriptionStatus === "active") return null;

  const daysRemaining = trialDaysRemaining(trialEndsAt);
  // Reverse trial: tier ainda é pago (monthly/quarterly) e o prazo não venceu.
  const inTrial = tier !== "free" && daysRemaining > 0;

  if (inTrial) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neon-orange/25 bg-neon-orange/10 px-6 py-3 text-sm text-orange-200 md:px-8">
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-neon-orange" />
          <span>
            Você está no período de teste completo —{" "}
            <strong className="font-numeric">
              {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </strong>
            . Aproveite todos os recursos pagos sem custo.
          </span>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-pill bg-neon-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-neon-glow"
        >
          Ver planos
        </Link>
      </div>
    );
  }

  // Trial acabou (ou nunca teve) e não é assinante — no plano Free.
  if (tier === "free") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-300 md:px-8">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-red-400" />
          <span>
            Seu período de teste acabou. Você está no plano Grátis, com recursos limitados — assine pra
            desbloquear tudo de novo.
          </span>
        </div>
        <Link
          href="/pricing"
          className={cn("shrink-0 rounded-pill bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-400")}
        >
          Ver planos
        </Link>
      </div>
    );
  }

  return null;
}
