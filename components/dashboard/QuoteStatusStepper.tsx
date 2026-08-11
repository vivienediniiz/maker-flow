"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

const STAGES: { key: QuoteStatus; label: string }[] = [
  { key: "sent", label: "Orçamento Enviado" },
  { key: "paid", label: "Pago" },
  { key: "in_production", label: "Em Produção" },
  { key: "shipped", label: "Pedido Enviado" },
];

export function QuoteStatusStepper({
  status,
  sentAt,
  onChange,
}: {
  status: QuoteStatus;
  sentAt: string;
  onChange?: (status: QuoteStatus) => void;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const clickable = !!onChange;

          return (
            <div key={stage.key} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onChange?.(stage.key)}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  done && "border-neon-green bg-neon-green/20 text-neon-green",
                  active && "border-neon-pink bg-neon-gradient text-white shadow-neon-glow",
                  !done && !active && "border-border-glass bg-white/[0.03] text-text-muted",
                  clickable && "cursor-pointer hover:opacity-80"
                )}
                title={stage.label}
              >
                {done ? <Check size={12} /> : i + 1}
              </button>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full",
                    i < currentIndex ? "bg-neon-green" : "bg-border-glass"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>{STAGES[currentIndex]?.label}</span>
        <span className="font-numeric">{new Date(sentAt).toLocaleDateString("pt-BR")}</span>
      </div>
    </div>
  );
}