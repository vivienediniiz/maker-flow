"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import { Save } from "lucide-react";

const SECTIONS = [
  { id: "energy", label: "Tarifa de Luz" },
  { id: "printers", label: "Parque de Impressoras" },
  { id: "marketplaces", label: "Taxas de Marketplaces" },
  { id: "risk", label: "Faixas de Risco Operacional" },
  { id: "labor", label: "Mão de Obra" },
  { id: "pdf", label: "Aparência do PDF" },
  { id: "locale", label: "Idioma / Moeda" },
];

export default function SettingsPage() {
  const [active, setActive] = useState("energy");
  const [dirty, setDirty] = useState(false);

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  return (
    <>
      <Topbar title="Configurações Globais" />
      <main className="grid grid-cols-1 gap-6 px-6 py-8 pb-28 md:px-8 lg:grid-cols-[220px_1fr]">
        {/* Sticky internal side menu */}
        <nav className="sticky top-24 hidden h-fit space-y-1 lg:block">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm transition-colors",
                active === s.id ? "bg-white/[0.06] text-text-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-6">
          <GlassCard id="energy" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Tarifa de Luz</h3>
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-xs text-text-muted">Tarifa (R$/kWh)</span>
              <input type="number" step="0.01" defaultValue={0.95} onChange={markDirty} className="glass-input w-full" />
            </label>
          </GlassCard>

          <GlassCard id="printers" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Parque de Impressoras</h3>
            <p className="text-sm text-text-secondary">Gerencie o cadastro completo em Cadastros → Impressoras.</p>
          </GlassCard>

          <GlassCard id="marketplaces" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Tabela Dinâmica de Taxas de Marketplaces</h3>
            <div className="space-y-2">
              {["Elo7", "Shopee", "Mercado Livre", "Loja própria"].map((mp) => (
                <div key={mp} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">{mp}</span>
                  <input type="number" defaultValue={12} onChange={markDirty} className="glass-input w-24" />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard id="risk" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Faixas de Risco Operacional</h3>
            <p className="text-sm text-text-secondary">
              Defina percentuais de contingência (falha de impressão, quebra de peça) por faixa de complexidade.
            </p>
          </GlassCard>

          <GlassCard id="labor" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Mão de Obra</h3>
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-xs text-text-muted">Valor hora padrão (R$)</span>
              <input type="number" defaultValue={25} onChange={markDirty} className="glass-input w-full" />
            </label>
          </GlassCard>

          <GlassCard id="pdf" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Aparência do PDF</h3>
            <p className="text-sm text-text-secondary">Logo, cores da marca e rodapé usados nos orçamentos exportados.</p>
          </GlassCard>

          <GlassCard id="locale" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Idioma / Moeda</h3>
            <div className="flex gap-4">
              <select onChange={markDirty} className="glass-input" defaultValue="pt-BR">
                <option value="pt-BR" className="bg-bg-raised">Português (BR)</option>
                <option value="en-US" className="bg-bg-raised">English (US)</option>
              </select>
              <select onChange={markDirty} className="glass-input" defaultValue="BRL">
                <option value="BRL" className="bg-bg-raised">R$ BRL</option>
                <option value="USD" className="bg-bg-raised">$ USD</option>
              </select>
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Floating save bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 md:left-[calc(50%+128px)]">
          <div className="glass-card flex items-center gap-4 px-5 py-3 shadow-neon-glow">
            <span className="text-sm text-text-secondary">Alterações não salvas</span>
            <NeonButton size="sm" onClick={() => setDirty(false)}>
              <Save size={14} /> Salvar alterações
            </NeonButton>
          </div>
        </div>
      )}
    </>
  );
}
