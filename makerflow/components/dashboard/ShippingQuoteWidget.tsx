"use client";

import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/utils";
import { formatCep } from "@/lib/viaCep";

export interface ShippingQuoteSelection {
  company: string;
  service: string;
  price: number;
  deliveryDays: number;
  /** CEP de destino realmente usado nessa cotação (pode ter sido editado no widget). */
  destinationCep: string;
  /** Peso/dimensões usados nessa cotação — guardados na venda pra reaproveitar depois na compra do frete de verdade, sem digitar tudo de novo. */
  weightG: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
}

interface QuoteResult {
  id: number;
  company: string;
  companyLogo: string | null;
  service: string;
  price: number;
  deliveryDays: number;
}

interface UnavailableResult {
  company: string;
  service: string;
  reason: string;
}

interface ShippingQuoteWidgetProps {
  /** Controlado pelo pai — auto-preenchido a partir do CEP do cliente selecionado, editável aqui. */
  destinationCep: string;
  onDestinationCepChange: (cep: string) => void;
  onSelect: (quote: ShippingQuoteSelection) => void;
  /** Mostra o aviso de campo obrigatório (cliente sem CEP cadastrado ainda). */
  required?: boolean;
}

/**
 * Inline, não é mais popup — assim que `destinationCep` tem algo digitado
 * (auto-preenchido do cliente ou digitado na mão), expande pra pedir
 * peso/dimensões e cotar. Fica sempre montado no formulário da venda.
 */
export function ShippingQuoteWidget({
  destinationCep,
  onDestinationCepChange,
  onSelect,
  required = false,
}: ShippingQuoteWidgetProps) {
  const [weightG, setWeightG] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [quotes, setQuotes] = useState<QuoteResult[] | null>(null);
  const [unavailable, setUnavailable] = useState<UnavailableResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expanded = destinationCep.replace(/\D/g, "").length > 0;

  async function handleQuote() {
    setError(null);
    setQuotes(null);
    setUnavailable([]);

    if (!destinationCep || !weightG || !heightCm || !widthCm || !lengthCm) {
      setError("Preencha CEP de destino, peso e dimensões.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationCep, weightG, heightCm, widthCm, lengthCm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao cotar frete.");
        return;
      }
      setUnavailable(data.unavailable ?? []);
      if (!data.quotes || data.quotes.length === 0) {
        setError("Nenhuma transportadora disponível pra esse CEP/dimensões.");
        return;
      }
      setQuotes(data.quotes);
    } catch {
      setError("Falha ao cotar frete — tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(quote: QuoteResult) {
    onSelect({
      company: quote.company,
      service: quote.service,
      price: quote.price,
      deliveryDays: quote.deliveryDays,
      destinationCep,
      weightG: Number(weightG) || 0,
      heightCm: Number(heightCm) || 0,
      widthCm: Number(widthCm) || 0,
      lengthCm: Number(lengthCm) || 0,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs text-text-muted">
          CEP de destino {required && <span className="text-neon-pink">*</span>}
        </label>
        <input
          value={destinationCep}
          onChange={(e) => onDestinationCepChange(formatCep(e.target.value))}
          className="glass-input w-full"
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
        />
        {required && (
          <p className="mt-1 text-[11px] text-amber-400">
            Esse cliente não tem CEP cadastrado — o CEP informado aqui é salvo no cadastro dele ao cotar o frete.
          </p>
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="shipping-weight-g" className="mb-1.5 block text-xs text-text-muted">
                Peso (g)
              </label>
              <input
                id="shipping-weight-g"
                type="number"
                min={0}
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label htmlFor="shipping-height-cm" className="mb-1.5 block text-xs text-text-muted">
                Altura (cm)
              </label>
              <input
                id="shipping-height-cm"
                type="number"
                min={0}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label htmlFor="shipping-width-cm" className="mb-1.5 block text-xs text-text-muted">
                Largura (cm)
              </label>
              <input
                id="shipping-width-cm"
                type="number"
                min={0}
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label htmlFor="shipping-length-cm" className="mb-1.5 block text-xs text-text-muted">
                Comprimento (cm)
              </label>
              <input
                id="shipping-length-cm"
                type="number"
                min={0}
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                className="glass-input w-full"
              />
            </div>
          </div>

          <NeonButton type="button" variant="outline" className="w-full justify-center" onClick={handleQuote} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
            {loading ? "Cotando..." : "Cotar Frete"}
          </NeonButton>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {quotes && (
            <div className="space-y-2">
              {quotes.map((q) => (
                <GlassCard
                  key={q.id}
                  hover
                  padding="md"
                  onClick={() => handleSelect(q)}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {q.company} · {q.service}
                    </p>
                    <p className="text-xs text-text-muted">
                      {q.deliveryDays} {q.deliveryDays === 1 ? "dia útil" : "dias úteis"}
                    </p>
                  </div>
                  <span className="neon-text font-numeric text-base font-semibold">{formatBRL(q.price)}</span>
                </GlassCard>
              ))}
            </div>
          )}

          {unavailable.length > 0 && (
            <div className="space-y-1 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-text-muted">Não cotaram</p>
              {unavailable.map((u, idx) => (
                <p key={idx} className="text-xs text-text-muted">
                  <span className="text-text-secondary">
                    {u.company}
                    {u.service ? ` · ${u.service}` : ""}:
                  </span>{" "}
                  {u.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
