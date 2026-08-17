"use client";

import { Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn, formatBRL } from "@/lib/utils";
import { formatOrderNumber, QUOTE_SOURCE_LABELS, QUOTE_SOURCE_BADGE_STYLES, nextQuoteAction } from "@/lib/quotes";
import type { QuoteWithClient, QuoteStatus } from "@/lib/types";

const STATUS_PILL_STYLES: Record<QuoteStatus, string> = {
  sent: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  paid: "bg-neon-green/15 text-neon-green border-neon-green/30",
  in_production: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  shipped: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_PILL_LABELS: Record<QuoteStatus, string> = {
  sent: "Orçamento Enviado",
  paid: "Pago",
  in_production: "Em Produção",
  shipped: "Concluído",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export function SaleCard({
  quote,
  onOpen,
  onDelete,
  onStatusChange,
}: {
  quote: QuoteWithClient;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onStatusChange: (status: QuoteStatus) => void;
}) {
  const buyerName = quote.buyer_name || quote.clients?.name || "Cliente não informado";
  const costs = quote.platform_fee + quote.cost_amount;
  const action = nextQuoteAction(quote.status);

  return (
    <GlassCard hover padding="md" onClick={onOpen} className="cursor-pointer space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-pill border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              QUOTE_SOURCE_BADGE_STYLES[quote.source]
            )}
          >
            {QUOTE_SOURCE_LABELS[quote.source]}
          </span>
          <span className="font-numeric text-xs text-text-muted">
            {quote.external_order_id ?? formatOrderNumber(quote.order_number)}
          </span>
        </div>
        <button onClick={onDelete} className="text-text-muted hover:text-red-400" aria-label="Excluir venda">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{buyerName}</p>
          <p className="truncate text-xs text-text-secondary">{quote.project_name}</p>
        </div>
        <span className={cn("shrink-0 rounded-pill border px-2.5 py-1 text-[11px] font-medium", STATUS_PILL_STYLES[quote.status])}>
          {STATUS_PILL_LABELS[quote.status]}
        </span>
      </div>

      <p className="text-[11px] text-text-muted">{new Date(quote.sent_at).toLocaleString("pt-BR")}</p>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5 text-center">
        <div>
          <p className="text-[10px] text-text-muted">Bruto</p>
          <p className="font-numeric text-sm font-medium text-text-primary">{formatBRL(quote.final_price)}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Custos</p>
          <p className="font-numeric text-sm font-medium text-red-400">{formatBRL(costs)}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Líquido</p>
          <p className="font-numeric text-sm font-medium text-neon-green">{formatBRL(quote.net_amount)}</p>
        </div>
      </div>

      {action && action.label && (
        <NeonButton
          size="sm"
          variant="outline"
          className="w-full justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(action.next);
          }}
        >
          {action.label}
        </NeonButton>
      )}
    </GlassCard>
  );
}
