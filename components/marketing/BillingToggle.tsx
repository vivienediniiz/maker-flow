"use client";

import { cn } from "@/lib/utils";
import type { BillingCycle } from "@/lib/plans";

export function BillingToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}) {
  return (
    <div className="glass-card inline-flex items-center gap-1 p-1">
      <button
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-pill px-5 py-2 text-sm font-medium transition-colors",
          value === "monthly" ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary"
        )}
      >
        Mensal
      </button>
      <button
        onClick={() => onChange("yearly")}
        className={cn(
          "flex items-center gap-2 rounded-pill px-5 py-2 text-sm font-medium transition-colors",
          value === "yearly" ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary"
        )}
      >
        Anual
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[10px] font-semibold",
            value === "yearly" ? "bg-white/20 text-white" : "bg-neon-green/15 text-neon-green"
          )}
        >
          -20%
        </span>
      </button>
    </div>
  );
}
