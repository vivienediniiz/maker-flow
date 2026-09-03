"use client";

import { useState } from "react";
import { Truck, Loader2, Copy, Check, Printer } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { ShippingPurchaseModal } from "@/components/dashboard/ShippingPurchaseModal";
import { formatBRL } from "@/lib/utils";
import type { QuoteWithClient } from "@/lib/types";

interface ShippingLabelSectionProps {
  quote: QuoteWithClient;
  onUpdate: (patch: Partial<QuoteWithClient>) => void;
}

/**
 * Card "Envio" — compra de frete (débito real na carteira Melhor Envio),
 * geração e impressão de etiqueta. Cada etapa é uma ação explícita; nada
 * aqui roda sozinho a partir de um clique só em outro lugar do painel.
 */
export function ShippingLabelSection({ quote, onUpdate }: ShippingLabelSectionProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = quote.shipping_label_status;

  async function handleGenerate() {
    setGenerating(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/shipping/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Falha ao gerar etiqueta.");
        return;
      }
      onUpdate(data);
    } catch {
      setActionError("Falha ao gerar etiqueta — tente de novo.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    setPrinting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/shipping/print`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Falha ao abrir etiqueta.");
        return;
      }
      onUpdate({ shipping_label_status: "impresso", shipping_label_url: data.url, shipping_printed_at: data.shipping_printed_at });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setActionError("Falha ao abrir etiqueta — tente de novo.");
    } finally {
      setPrinting(false);
    }
  }

  function handleCopyTracking() {
    if (!quote.shipping_tracking_code) return;
    navigator.clipboard.writeText(quote.shipping_tracking_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Envio</p>

      {(status === "nao_iniciado" || status === "no_carrinho") && (
        <>
          {status === "no_carrinho" && (
            <p className="text-[11px] text-amber-400">
              Uma tentativa de compra anterior não terminou (checkout falhou) — nada foi debitado ainda. Tente de novo.
            </p>
          )}
          <NeonButton type="button" variant="outline" size="sm" className="w-full" onClick={() => setPurchaseOpen(true)}>
            <Truck size={14} /> {status === "no_carrinho" ? "Retomar Compra do Frete" : "Comprar Frete"}
          </NeonButton>
        </>
      )}

      {status === "comprado" && (
        <div className="glass-card space-y-2 p-3">
          <p className="text-xs text-text-secondary">
            {quote.shipping_carrier_name} · {quote.shipping_service_name}
          </p>
          {quote.shipping_purchased_cost != null && (
            <p className="text-sm font-medium text-neon-green">{formatBRL(quote.shipping_purchased_cost)}</p>
          )}
          <NeonButton type="button" size="sm" className="w-full" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            {generating ? "Gerando..." : "Gerar Etiqueta"}
          </NeonButton>
        </div>
      )}

      {(status === "gerado" || status === "impresso") && (
        <div className="glass-card space-y-2 p-3">
          <p className="text-xs text-text-secondary">
            {quote.shipping_carrier_name} · {quote.shipping_service_name}
          </p>
          {quote.shipping_tracking_code ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{quote.shipping_tracking_code}</span>
              <button
                type="button"
                onClick={handleCopyTracking}
                className={`flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  copied ? "text-neon-green" : "text-neon-pink hover:bg-white/5"
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">Rastreio ainda não disponível — a transportadora libera depois de coletar.</p>
          )}
          <NeonButton type="button" size="sm" className="w-full" onClick={handlePrint} disabled={printing}>
            {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            {status === "impresso" ? "Abrir Etiqueta de Novo" : "Imprimir Etiqueta"}
          </NeonButton>
          <p className="text-[11px] text-text-muted">
            Abre a interface de impressão do Melhor Envio — PDF ou impressora térmica (ZPL) se escolhe lá dentro.
          </p>
          {status === "impresso" && <p className="text-[11px] text-text-muted">Impressão já foi acionada — isso registra a ação, não confirma que saiu da impressora.</p>}
        </div>
      )}

      {actionError && <p className="text-[11px] text-red-400">{actionError}</p>}

      <ShippingPurchaseModal quote={quote} open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onPurchased={onUpdate} />
    </div>
  );
}
