"use client";

import { useState } from "react";
import { CheckCircle2, Link2, Copy, Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { SaleReceiptModal } from "@/components/dashboard/SaleReceiptModal";
import { formatBRL } from "@/lib/utils";
import { formatOrderNumber } from "@/lib/quotes";
import type { QuoteWithClient } from "@/lib/types";

export function SaleSuccessModal({ quote, onClose }: { quote: QuoteWithClient | null; onClose: () => void }) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!quote) return null;

  async function handleGenerateLink() {
    setGeneratingLink(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/quotes/${quote!.id}/payment-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error ?? "Não foi possível gerar o link.");
        return;
      }
      setPaymentLink(data.url);
    } catch {
      setLinkError("Falha ao gerar o link — tente de novo.");
    } finally {
      setGeneratingLink(false);
    }
  }

  function handleCopy() {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
          <div className="flex w-full flex-col gap-2 pt-2">
            <div className="flex w-full gap-3">
              <NeonButton variant="ghost" className="flex-1" onClick={onClose}>
                Fechar
              </NeonButton>
              <NeonButton className="flex-1" onClick={() => setReceiptOpen(true)}>
                Gerar Comprovante
              </NeonButton>
            </div>

            {paymentLink ? (
              <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2">
                <Link2 size={13} className="shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{paymentLink}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    copied ? "text-neon-green" : "text-neon-pink hover:bg-white/5"
                  }`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : (
              <NeonButton
                variant="outline"
                className="w-full"
                onClick={handleGenerateLink}
                disabled={generatingLink}
              >
                {generatingLink ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {generatingLink ? "Gerando..." : "Gerar Link de Cobrança"}
              </NeonButton>
            )}
            {!paymentLink && (
              <p className="text-[11px] text-text-muted">
                Ao gerar, essa venda volta pra "aguardando pagamento" até o cliente pagar pelo link.
              </p>
            )}
            {linkError && <p className="text-xs text-red-400">{linkError}</p>}
          </div>
        </div>
      </Modal>

      <SaleReceiptModal quote={quote} open={receiptOpen} onClose={() => setReceiptOpen(false)} zIndexClass="z-[60]" />
    </>
  );
}
