"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";
import { CheckCircle2, Truck } from "lucide-react";

const QUOTES = [
  { carrier: "Correios PAC", eta: "6-9 dias úteis", price: 22.4 },
  { carrier: "Correios SEDEX", eta: "2-4 dias úteis", price: 38.9 },
  { carrier: "Jadlog Package", eta: "4-7 dias úteis", price: 19.8 },
  { carrier: "Loggi Ponto a Ponto", eta: "1-2 dias úteis", price: 27.5 },
];

export default function ShippingPage() {
  const [quoted, setQuoted] = useState(false);

  return (
    <>
      <Topbar title="Cálculo de Frete" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-pill border border-neon-green/30 bg-neon-green/10 px-4 py-2 text-xs font-medium text-neon-green">
          <CheckCircle2 size={14} /> Melhor Envio Conectado
        </div>

        <GlassCard padding="lg" className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="CEP de origem">
              <input placeholder="00000-000" className="glass-input w-full" />
            </Field>
            <Field label="CEP de destino">
              <input placeholder="00000-000" className="glass-input w-full" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Peso (kg)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Altura (cm)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Largura (cm)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Comprimento (cm)"><input type="number" className="glass-input w-full" /></Field>
          </div>
          <NeonButton onClick={() => setQuoted(true)}>
            <Truck size={16} /> Cotar frete
          </NeonButton>
        </GlassCard>

        {quoted && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUOTES.map((q) => (
              <GlassCard key={q.carrier} hover padding="md" className="space-y-2">
                <p className="text-sm font-medium text-text-primary">{q.carrier}</p>
                <p className="text-xs text-text-muted">{q.eta}</p>
                <p className="neon-text font-numeric text-xl font-semibold">{formatBRL(q.price)}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-text-muted">{label}</label>
      {children}
    </div>
  );
}
