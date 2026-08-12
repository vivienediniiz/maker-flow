"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";

const SECTIONS = [
  { id: "energy", label: "Tarifa de Luz" },
  { id: "printers", label: "Parque de Impressoras" },
  { id: "marketplaces", label: "Taxas de Marketplaces" },
  { id: "shipping", label: "Frete (Remetente)" },
  { id: "risk", label: "Faixas de Risco Operacional" },
  { id: "labor", label: "Mão de Obra" },
  { id: "pdf", label: "Aparência do PDF" },
  { id: "locale", label: "Idioma / Moeda" },
];

const DEFAULT_MARKETPLACES: Record<string, number> = {
  "TikTok Shop": 12,
  Shopee: 14,
  "Mercado Livre": 16,
  "Loja Própria": 0,
};

interface MarketplaceRow {
  name: string;
  fee: number;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [active, setActive] = useState("energy");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marketplaces, setMarketplaces] = useState<MarketplaceRow[]>([]);
  const [newName, setNewName] = useState("");
  const [originCep, setOriginCep] = useState("");
  const [originAddress, setOriginAddress] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("settings")
      .select("marketplace_fees_json, origin_cep, origin_address")
      .eq("user_id", user.id)
      .single();

    setOriginCep(data?.origin_cep ?? "");
    setOriginAddress(data?.origin_address ?? "");

    const hasExisting = data?.marketplace_fees_json && Object.keys(data.marketplace_fees_json).length > 0;
    const feesObj: Record<string, number> = hasExisting ? data!.marketplace_fees_json : DEFAULT_MARKETPLACES;

    setMarketplaces(Object.entries(feesObj).map(([name, fee]) => ({ name, fee: Number(fee) })));

    // Se ainda não havia nada salvo, grava os padrões agora — assim outras
    // telas (Calculadora) já encontram os marketplaces sem precisar que o
    // usuário clique em "Salvar alterações" primeiro.
    if (!hasExisting) {
      await supabase.from("settings").update({ marketplace_fees_json: feesObj }).eq("user_id", user.id);
    }

    setLoading(false);
  }

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  function updateFee(index: number, fee: number) {
    setMarketplaces((prev) => prev.map((m, i) => (i === index ? { ...m, fee } : m)));
    markDirty();
  }

  function removeMarketplace(index: number) {
    setMarketplaces((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function addMarketplace() {
    if (!newName.trim()) return;
    setMarketplaces((prev) => [...prev, { name: newName.trim(), fee: 0 }]);
    setNewName("");
    markDirty();
  }

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const feesObj: Record<string, number> = {};
    marketplaces.forEach((m) => {
      feesObj[m.name] = m.fee;
    });

    await supabase
      .from("settings")
      .update({ marketplace_fees_json: feesObj, origin_cep: originCep || null, origin_address: originAddress || null })
      .eq("user_id", user.id);

    setSaving(false);
    setDirty(false);
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

            {loading ? (
              <div className="flex justify-center py-6 text-text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {marketplaces.map((mp, i) => (
                    <div key={mp.name + i} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-secondary">{mp.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={mp.fee}
                            onChange={(e) => updateFee(i, Number(e.target.value))}
                            className="glass-input w-20"
                          />
                          <span className="text-xs text-text-muted">%</span>
                        </div>
                        <button
                          onClick={() => removeMarketplace(i)}
                          className="text-text-muted hover:text-red-400"
                          aria-label="Remover marketplace"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-border-glass pt-4">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMarketplace())}
                    placeholder="Nome do novo marketplace"
                    className="glass-input w-full"
                  />
                  <NeonButton type="button" variant="outline" size="sm" onClick={addMarketplace}>
                    <Plus size={14} /> Adicionar mais
                  </NeonButton>
                </div>
              </>
            )}
          </GlassCard>

          <GlassCard id="shipping" padding="lg" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg">Frete (Remetente)</h3>
            <p className="text-sm text-text-secondary">
              Cadastre o CEP e endereço do seu estúdio aqui — assim, ao criar um pedido, você só
              precisa informar o frete do destinatário, sem repetir os dados de origem toda vez.
            </p>
            <div className="grid max-w-md grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs text-text-muted">CEP de origem</span>
                <input
                  value={originCep}
                  onChange={(e) => {
                    setOriginCep(e.target.value);
                    markDirty();
                  }}
                  className="glass-input w-full"
                  placeholder="00000-000"
                />
              </label>
            </div>
            <label className="block max-w-md">
              <span className="mb-1.5 block text-xs text-text-muted">Endereço completo</span>
              <input
                value={originAddress}
                onChange={(e) => {
                  setOriginAddress(e.target.value);
                  markDirty();
                }}
                className="glass-input w-full"
                placeholder="Rua, número, cidade — UF"
              />
            </label>
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
            <NeonButton size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? "Salvando..." : "Salvar alterações"}
            </NeonButton>
          </div>
        </div>
      )}
    </>
  );
}