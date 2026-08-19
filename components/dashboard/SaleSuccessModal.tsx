"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { SaleReceiptModal } from "@/components/dashboard/SaleReceiptModal";
import { formatBRL } from "@/lib/utils";
import { formatOrderNumber } from "@/lib/quotes";
import type { QuoteWithClient } from "@/lib/types";

export function SaleSuccessModal({ quote, onClose }: { quote: QuoteWithClient | null; onClose: () => void }) {
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!quote) return null;

  return (
    <>
      <Modal open={!!quote} onClose={onClose} title="Venda Criada" maxWidthClass="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green/15 text-neon-green">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              Venda {formatOrderNumber(quote.order_number)} registrada com sucesso
            </p>
            <p className="neon-text font-numeric text-2xl font-semibold">{formatBRL(quote.final_price)}</p>
          </div>
          <div className="flex w-full gap-3 pt-2">
            <NeonButton variant="ghost" className="flex-1" onClick={onClose}>
              Fechar
            </NeonButton>
            <NeonButton className="flex-1" onClick={() => setReceiptOpen(true)}>
              Gerar Comprovante
            </NeonButton>
          </div>
        </div>
      </Modal>

      <SaleReceiptModal quote={quote} open={receiptOpen} onClose={() => setReceiptOpen(false)} zIndexClass="z-[60]" />
    </>
  );
}
