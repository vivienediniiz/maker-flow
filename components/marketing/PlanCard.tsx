"use client";

import { Check, Loader2 } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { NeonButton } from "@/components/ui/NeonButton";
import { getCyclePricing, type Plan, type BillingCycle } from "@/lib/plans";

export function PlanCard({
  plan,
  cycle,
  loading,
  onSubscribeCard,
  onPayPix,
}: {
  plan: Plan;
  cycle: BillingCycle;
  loading: boolean;
  onSubscribeCard: () => void;
  onPayPix: () => void;
}) {
  const pricing = getCyclePricing(plan.id, cycle);
  const frequencyLabel = pricing.frequencyMonths === 1 ? "/mês" : "/ano";

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-6 p-8",
        plan.highlighted && "border-2 border-neon-pink/60 shadow-neon-glow"
      )}
    >
      {plan.highlighted && (
        <span className="w-fit rounded-pill bg-neon-gradient px-3 py-1 text-[11px] font-semibold text-white">
          Mais popular
        </span>
      )}

      <div>
        <h3 className="font-display text-xl">{plan.name}</h3>
        <p className="mt-1 text-sm text-text-secondary">{plan.tagline}</p>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-numeric text-4xl font-semibold text-text-primary">{formatBRL(pricing.price)}</span>
        <span className="text-sm text-text-muted">{frequencyLabel}</span>
        {pricing.discountLabel && (
          <span className="rounded-pill bg-neon-green/15 px-2 py-0.5 text-[11px] font-semibold text-neon-green">
            {pricing.discountLabel}
          </span>
        )}
      </div>

      <ul className="space-y-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-text-secondary">
            <Check size={16} className="mt-0.5 shrink-0 text-neon-green" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2">
        <NeonButton
          variant={plan.highlighted ? "primary" : "outline"}
          className="w-full"
          onClick={onSubscribeCard}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : `Assinar ${plan.name} (cartão)`}
        </NeonButton>
        <NeonButton variant="ghost" className="w-full" onClick={onPayPix} disabled={loading}>
          Pagar com Pix (manual)
        </NeonButton>
      </div>
    </div>
  );
}
