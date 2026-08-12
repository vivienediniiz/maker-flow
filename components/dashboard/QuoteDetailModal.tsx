"use client";

import { Modal } from "@/components/ui/Modal";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { formatBRL } from "@/lib/utils";
import { formatOrderNumber } from "@/lib/quotes";
import type { QuoteWithClient, QuoteStatus, QuotePaymentMethod } from "@/lib/types";

const PAYMENT_METHOD_LABELS: Record<QuotePaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
};

export function QuoteDetailModal({
  quote,
  onClose,
  onStatusChange,
}: {
  quote: QuoteWithClient | null;
  onClose: () => void;
  onStatusChange: (quoteId: string, status: QuoteStatus) => void;
}) {
  if (!quote) return null;

  const hasCalcDetails = quote.weight_g > 0 || quote.print_time_min > 0;

  return (
    <Modal open={!!quote} onClose={onClose} title={`Pedido ${formatOrderNumber(quote.order_number)}`}>
      <div className="space-y-5">
        <div className="glass-card space-y-1 p-4">
          <p className="text-sm font-medium text-text-primary">{quote.clients?.name ?? "Cliente não informado"}</p>
          {quote.clients?.phone && <p className="text-xs text-text-muted">{quote.clients.phone}</p>}
          <p className="mt-2 text-xs text-text-secondary">{quote.project_name}</p>
        </div>

        {hasCalcDetails ? (
          <div className="space-y-2 text-sm">
            <Row label="Peso total" value={`${quote.weight_g.toFixed(0)} g`} />
            <Row label="Tempo de impressão" value={`${(quote.print_time_min / 60).toFixed(1)} h`} />
            <Row label="Custo de filamento" value={formatBRL(quote.filament_cost)} />
            <Row label="Custo de energia" value={formatBRL(quote.energy_cost)} />
            <Row label="Margem aplicada" value={`${quote.margin_percent}%`} />
            <div className="my-1 h-px bg-border-glass" />
          </div>
        ) : (
          <p className="text-xs text-text-muted">Este pedido não tem detalhamento de cálculo salvo.</p>
        )}

        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs text-text-muted">Valor final</span>
          <span className="font-numeric text-lg font-semibold text-neon-pink">{formatBRL(quote.final_price)}</span>
        </div>

        {quote.payment_method && (
          <p className="text-xs text-text-muted">
            Forma de pagamento: <span className="text-text-secondary">{PAYMENT_METHOD_LABELS[quote.payment_method]}</span>
          </p>
        )}

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Status do pedido</p>
          <QuoteStatusStepper
            status={quote.status}
            sentAt={quote.sent_at}
            onChange={(status) => onStatusChange(quote.id, status)}
          />
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-text-secondary">
      <span>{label}</span>
      <span className="font-numeric text-text-primary">{value}</span>
    </div>
  );
}