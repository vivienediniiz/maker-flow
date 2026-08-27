"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/utils";

// Mesma fórmula usada pela Calculadora de verdade (lib/costCalculator.ts),
// simplificada pra 1 mesa/1 unidade — sem depreciação de impressora nem taxa
// de falha, porque o produto real não calcula esses dois fatores hoje.
function calcSample(input: {
  weightG: number;
  hours: number;
  pricePerKg: number;
  watts: number;
  kwhRate: number;
  laborMinutes: number;
  hourlyRate: number;
  marginPercent: number;
}) {
  const filamentCost = (input.weightG / 1000) * input.pricePerKg;
  const energyCost = (input.watts / 1000) * input.hours * input.kwhRate;
  const laborCost = (input.laborMinutes / 60) * input.hourlyRate;
  const costTotal = filamentCost + energyCost + laborCost;
  const clampedMargin = Math.min(Math.max(input.marginPercent, 0), 95);
  const price = costTotal / (1 - clampedMargin / 100);
  return { filamentCost, energyCost, laborCost, costTotal, price, profit: price - costTotal };
}

const DEFAULTS = {
  weightG: 80,
  hours: 3.5,
  pricePerKg: 120,
  watts: 150,
  kwhRate: 0.85,
  laborMinutes: 15,
  hourlyRate: 25,
  marginPercent: 60,
};

export function LiveCalculatorSection() {
  const [input, setInput] = useState(DEFAULTS);

  const result = useMemo(() => calcSample(input), [input]);

  function set<K extends keyof typeof DEFAULTS>(key: K, value: number) {
    setInput((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));
  }

  return (
    <section className="mx-auto mt-28 max-w-5xl px-6 md:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
          <Calculator size={20} />
        </div>
        <h2 className="font-display mt-4 text-3xl md:text-4xl">
          Calcule agora. <span className="neon-text">Sem criar conta.</span>
        </h2>
        <p className="mt-4 text-text-secondary">
          Coloque os dados de uma peça que você imprimiu essa semana — o cálculo abaixo usa a mesma fórmula da
          Calculadora de verdade do Studio Maker.
        </p>
      </div>

      <GlassCard padding="lg" className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <NumField label="Peso da peça (g)" value={input.weightG} onChange={(v) => set("weightG", v)} />
          <NumField label="Tempo de impressão (h)" value={input.hours} step={0.5} onChange={(v) => set("hours", v)} />
          <NumField label="Preço do rolo 1kg (R$)" value={input.pricePerKg} onChange={(v) => set("pricePerKg", v)} />
          <NumField label="Potência da impressora (W)" value={input.watts} onChange={(v) => set("watts", v)} />
          <NumField label="Preço do kWh (R$)" value={input.kwhRate} step={0.01} onChange={(v) => set("kwhRate", v)} />
          <NumField label="Seu tempo dedicado (min)" value={input.laborMinutes} onChange={(v) => set("laborMinutes", v)} />
          <NumField label="Valor da sua hora (R$)" value={input.hourlyRate} onChange={(v) => set("hourlyRate", v)} />
          <NumField label="Margem desejada (%)" value={input.marginPercent} onChange={(v) => set("marginPercent", v)} />
        </div>

        <div className="flex flex-col justify-between rounded-glass border border-border-glass bg-white/[0.02] p-6">
          <div className="space-y-2.5 text-sm">
            <ResultRow label="Filamento" value={result.filamentCost} />
            <ResultRow label="Energia" value={result.energyCost} />
            <ResultRow label="Seu tempo" value={result.laborCost} />
            <div className="my-1 border-t border-border-glass" />
            <ResultRow label="Custo total" value={result.costTotal} emphasis />
          </div>

          <div className="mt-6 space-y-1 border-t border-border-glass pt-6">
            <p className="text-xs uppercase tracking-wider text-text-muted">Preço sugerido de venda</p>
            <p className="font-numeric text-3xl font-semibold text-text-primary">{formatBRL(result.price)}</p>
            <p className="text-sm text-neon-green">Lucro por peça: {formatBRL(result.profit)}</p>
          </div>
        </div>
      </GlassCard>

      <div className="mt-6 text-center">
        <p className="mx-auto max-w-xl text-sm text-text-secondary">
          Esse cálculo é uma amostra simplificada. No Studio Maker completo, ele fica salvo no catálogo do seu
          produto e vira orçamento em PDF com um clique.
        </p>
        <Link href="/signup" className="neon-btn mt-5 inline-flex">
          Criar conta grátis <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-text-muted">{label}</label>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="glass-input w-full"
      />
    </div>
  );
}

function ResultRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${emphasis ? "font-medium text-text-primary" : "text-text-secondary"}`}>
      <span>{label}</span>
      <span className="font-numeric">{formatBRL(value)}</span>
    </div>
  );
}
