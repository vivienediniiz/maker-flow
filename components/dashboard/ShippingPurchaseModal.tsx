"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/utils";
import type { QuoteWithClient } from "@/lib/types";

interface CarrierQuote {
  id: number;
  company: string;
  companyLogo: string | null;
  service: string;
  price: number;
  deliveryDays: number;
}

interface ShippingPurchaseModalProps {
  quote: QuoteWithClient;
  open: boolean;
  onClose: () => void;
  onPurchased: (patch: Partial<QuoteWithClient>) => void;
}

type Step = "form" | "quotes" | "confirm";

/**
 * Compra de frete de verdade (débito na carteira Melhor Envio) — por isso
 * nunca avança sem um clique explícito de confirmação em cada etapa que
 * gasta dinheiro. Cotar/listar transportadoras não custa nada; só
 * "Confirmar compra" no passo final chama a API que debita.
 */
export function ShippingPurchaseModal({ quote, open, onClose, onPurchased }: ShippingPurchaseModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [weightG, setWeightG] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [carriers, setCarriers] = useState<CarrierQuote[]>([]);
  const [selected, setSelected] = useState<CarrierQuote | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setWeightG(quote.weight_g > 0 ? String(Math.round(quote.weight_g)) : "");
    setHeightCm("");
    setWidthCm("");
    setLengthCm("");
    setQuoteError(null);
    setMissingFields(null);
    setBalance(null);
    setCarriers([]);
    setSelected(null);
    setBuyError(null);
  }, [open, quote.id, quote.weight_g]);

  async function handleQuote() {
    setQuoteError(null);
    setMissingFields(null);

    if (!weightG || !heightCm || !widthCm || !lengthCm) {
      setQuoteError("Preencha peso e dimensões do pacote.");
      return;
    }

    setLoadingQuote(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/shipping/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightG, heightCm, widthCm, lengthCm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data.error ?? "Falha ao cotar frete.");
        if (data.missing) setMissingFields(data.missing);
        return;
      }
      setBalance(data.balance);
      if (!data.quotes || data.quotes.length === 0) {
        setQuoteError("Nenhuma transportadora disponível pra esse CEP/dimensões.");
        return;
      }
      setCarriers(data.quotes);
      setStep("quotes");
    } catch {
      setQuoteError("Falha ao cotar frete — tente de novo.");
    } finally {
      setLoadingQuote(false);
    }
  }

  function handleSelectCarrier(carrier: CarrierQuote) {
    setSelected(carrier);
    setBuyError(null);
    setStep("confirm");
  }

  async function handleConfirmBuy() {
    if (!selected) return;
    setBuying(true);
    setBuyError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/shipping/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selected.id,
          price: selected.price,
          carrierName: selected.company,
          serviceName: selected.service,
          weightG,
          heightCm,
          widthCm,
          lengthCm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuyError(data.error ?? "Falha ao comprar o frete.");
        return;
      }
      onPurchased(data);
      onClose();
    } catch {
      setBuyError("Falha ao comprar o frete — tente de novo.");
    } finally {
      setBuying(false);
    }
  }

  const insufficientBalance = balance != null && selected != null && balance < selected.price;
  const destinationLabel = [quote.clients?.city, quote.clients?.state].filter(Boolean).join(" - ");

  return (
    <Modal open={open} onClose={onClose} title="Comprar Frete" zIndexClass="z-[60]">
      <div className="space-y-4">
        {step === "form" && (
          <>
            <p className="text-xs text-text-muted">Peso e dimensões do pacote que vai ser enviado.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Peso (g)</label>
                <input type="number" min={0} value={weightG} onChange={(e) => setWeightG(e.target.value)} className="glass-input w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Altura (cm)</label>
                <input type="number" min={0} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="glass-input w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Largura (cm)</label>
                <input type="number" min={0} value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className="glass-input w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Comprimento (cm)</label>
                <input type="number" min={0} value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className="glass-input w-full" />
              </div>
            </div>

            <NeonButton type="button" className="w-full" onClick={handleQuote} disabled={loadingQuote}>
              {loadingQuote ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              {loadingQuote ? "Cotando..." : "Cotar Transportadoras"}
            </NeonButton>

            {quoteError && <p className="text-xs text-red-400">{quoteError}</p>}
            {missingFields && (
              <div className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <AlertTriangle size={13} /> Endereço incompleto pra gerar etiqueta:
                </p>
                <ul className="ml-5 list-disc text-xs text-amber-200/90">
                  {missingFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-text-muted">Complete no cadastro do cliente e no Perfil do Estúdio, depois tente de novo.</p>
              </div>
            )}
          </>
        )}

        {step === "quotes" && (
          <>
            {balance != null && (
              <p className="text-xs text-text-muted">
                Saldo na carteira Melhor Envio: <span className="text-text-secondary">{formatBRL(balance)}</span>
              </p>
            )}
            <div className="space-y-2">
              {carriers.map((c) => (
                <GlassCard
                  key={c.id}
                  hover
                  padding="md"
                  onClick={() => handleSelectCarrier(c)}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {c.company} · {c.service}
                    </p>
                    <p className="text-xs text-text-muted">
                      {c.deliveryDays} {c.deliveryDays === 1 ? "dia útil" : "dias úteis"}
                    </p>
                  </div>
                  <span className="neon-text font-numeric text-base font-semibold">{formatBRL(c.price)}</span>
                </GlassCard>
              ))}
            </div>
            <NeonButton type="button" variant="ghost" size="sm" onClick={() => setStep("form")}>
              Voltar
            </NeonButton>
          </>
        )}

        {step === "confirm" && selected && (
          <>
            <div className="glass-card space-y-2 p-4 text-sm">
              <Row label="Transportadora" value={`${selected.company} · ${selected.service}`} />
              <Row label="Prazo estimado" value={`${selected.deliveryDays} ${selected.deliveryDays === 1 ? "dia útil" : "dias úteis"}`} />
              <Row label="Destino" value={`${quote.clients?.name ?? "—"}${destinationLabel ? ` · ${destinationLabel}` : ""}`} />
              <Row label="Valor do frete" value={formatBRL(selected.price)} highlight />
            </div>

            {balance != null && (
              <p className="text-xs text-text-muted">
                Saldo na carteira: <span className={insufficientBalance ? "text-red-400" : "text-text-secondary"}>{formatBRL(balance)}</span>
              </p>
            )}

            {insufficientBalance && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle size={13} /> Saldo insuficiente — adicione crédito na carteira Melhor Envio antes de comprar.
              </p>
            )}

            <div className="flex gap-2">
              <NeonButton type="button" variant="ghost" size="sm" onClick={() => setStep("quotes")} disabled={buying}>
                Voltar
              </NeonButton>
              <NeonButton
                type="button"
                className="flex-1"
                onClick={handleConfirmBuy}
                disabled={buying || insufficientBalance}
              >
                {buying ? <Loader2 size={16} className="animate-spin" /> : null}
                {buying ? "Comprando..." : `Confirmar compra do frete por ${formatBRL(selected.price)}`}
              </NeonButton>
            </div>

            {buyError && <p className="text-xs text-red-400">{buyError}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={highlight ? "neon-text font-numeric text-base font-semibold" : "font-numeric text-text-primary"}>{value}</span>
    </div>
  );
}
