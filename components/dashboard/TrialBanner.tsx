import Link from "next/link";
import { Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/lib/types";

export function TrialBanner({
  tier,
  daysRemaining,
}: {
  tier: SubscriptionTier;
  daysRemaining: number;
}) {
  // Usuário já é assinante pago — sem banner de trial.
  if (tier !== "free") return null;

  const expired = daysRemaining <= 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 text-sm md:px-8",
        expired
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-neon-orange/25 bg-neon-orange/10 text-orange-200"
      )}
    >
      <div className="flex items-center gap-2.5">
        {expired ? <AlertTriangle size={16} className="text-red-400" /> : <Sparkles size={16} className="text-neon-orange" />}
        {expired ? (
          <span>
            Seu período gratuito acabou. Assine um plano para continuar usando o StudioMaker sem interrupções.
          </span>
        ) : (
          <span>
            Você está no período gratuito —{" "}
            <strong className="font-numeric">
              {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </strong>
            .
          </span>
        )}
      </div>

      <Link
        href="/pricing"
        className={cn(
          "shrink-0 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors",
          expired
            ? "bg-red-500 text-white hover:bg-red-400"
            : "bg-neon-gradient text-white shadow-neon-glow"
        )}
      >
        Ver planos
      </Link>
    </div>
  );
}