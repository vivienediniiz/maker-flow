"use client";

import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS_ORDER, QUOTE_STATUS_LABELS, quoteDaysUntilExpiry } from "@/lib/quotes";
import type { QuoteStatus } from "@/lib/types";

export function QuoteStatusStepper({
  status,
  sentAt,
  onChange,
}: {
  status: QuoteStatus;
  sentAt: string;
  onChange?: (status: QuoteStatus) => void;
}) {
  if (status === "expired") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={13} /> Orçamento expirado
        </span>
        {onChange && (
          <button
            type="button"
            onClick={() => onChange("sent")}
            className="flex min-h-[44px] items-center justify-center rounded-pill bg-red-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-400 sm:min-h-0"
          >
            Reabrir
          </button>
        )}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
        <AlertTriangle size={13} /> Venda cancelada
      </div>
    );
  }

  // "awaiting_payment" não está em QUOTE_STATUS_ORDER (é uma variante de
  // "sent" pra vendas confirmadas aguardando pagamento) — ocupa a mesma
  // posição do primeiro estágio na barra.
  const currentIndex = status === "awaiting_payment" ? 0 : QUOTE_STATUS_ORDER.indexOf(status);
  const daysLeft = status === "sent" ? quoteDaysUntilExpiry(sentAt) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {QUOTE_STATUS_ORDER.map((stageKey, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const clickable = !!onChange;

          return (
            <div key={stageKey} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onChange?.(stageKey)}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                  done && "border-neon-green bg-neon-green/20 text-neon-green",
                  active && "border-neon-pink bg-neon-gradient text-white shadow-neon-glow",
                  !done && !active && "border-border-glass bg-white/[0.03] text-text-muted",
                  clickable && "cursor-pointer hover:opacity-80"
                )}
                title={QUOTE_STATUS_LABELS[stageKey]}
              >
                {done ? <Check size={12} /> : i + 1}
              </button>
              {i < QUOTE_STATUS_ORDER.length - 1 && (
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
        <span>{QUOTE_STATUS_LABELS[status]}</span>
        <span className="font-numeric">
          {daysLeft !== null ? `vence em ${daysLeft}d` : new Date(sentAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}