"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL, cn } from "@/lib/utils";
import { SlidersHorizontal, PackagePlus, Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";

const PRODUCTS: Product[] = [
  { id: "1", user_id: "u1", name: "Vaso Geométrico Torcido", category: "Decoração", cost_price: 8.4, sale_price: 42, stock_quantity: 12 },
  { id: "2", user_id: "u1", name: "Suporte de Headset RGB", category: "Gamer", cost_price: 14.2, sale_price: 69, stock_quantity: 5 },
  { id: "3", user_id: "u1", name: "Miniatura Dragão Articulado", category: "Colecionável", cost_price: 22.0, sale_price: 129, stock_quantity: 3 },
  { id: "4", user_id: "u1", name: "Organizador de Mesa Modular", category: "Escritório", cost_price: 11.5, sale_price: 58, stock_quantity: 20 },
];

export default function ProductsPage() {
  const [tab, setTab] = useState<"catalog" | "projects">("catalog");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      <Topbar title="Produtos e Catálogo" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "catalog", label: "Catálogo de Produtos" },
              { value: "projects", label: "Todos os Projetos" },
            ]}
          />
          <div className="flex items-center gap-3">
            <div className="relative">
              <NeonButton variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
                <SlidersHorizontal size={14} /> Filtros
              </NeonButton>
              {showFilters && (
                <div className="glass-card absolute right-0 top-12 z-20 w-56 space-y-3 p-4 shadow-neon-glow">
                  <p className="text-xs text-text-muted">Categoria</p>
                  {["Decoração", "Gamer", "Colecionável", "Escritório"].map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-text-secondary">
                      <input type="checkbox" className="accent-[#FF4EDF]" /> {c}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <NeonButton size="sm">
              <PackagePlus size={14} /> Novo Produto
            </NeonButton>
          </div>
        </div>

        {tab === "catalog" ? (
          PRODUCTS.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {PRODUCTS.map((p) => {
                const profit = p.sale_price - p.cost_price;
                const margin = (profit / p.sale_price) * 100;
                return (
                  <GlassCard key={p.id} hover padding="md" className="space-y-3">
                    <div className="flex h-28 items-center justify-center rounded-xl bg-neon-gradient-soft">
                      <span className="text-3xl">🧩</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.category}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Custo médio" value={formatBRL(p.cost_price)} />
                      <Stat label="Venda" value={formatBRL(p.sale_price)} />
                      <Stat label="Lucro" value={formatBRL(profit)} accent="green" />
                      <Stat label="Margem" value={`${margin.toFixed(0)}%`} accent="pink" />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )
        ) : (
          <GlassCard padding="lg" className="text-sm text-text-secondary">
            Lista de todos os projetos (orçados e em produção) aparece aqui, unificando catálogo e histórico de orçamentos.
          </GlassCard>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "pink" }) {
  return (
    <div className="glass-card px-2.5 py-2">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className={cn("font-numeric font-medium", accent === "green" && "text-neon-green", accent === "pink" && "text-neon-pink")}>
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <GlassCard padding="lg" className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient shadow-neon-glow">
        <Sparkles size={22} className="text-white" />
      </div>
      <div>
        <p className="font-display text-lg">Seu catálogo está vazio</p>
        <p className="text-sm text-text-muted">Adicione seu primeiro produto ou explore com dados de demonstração.</p>
      </div>
      <div className="flex gap-3">
        <NeonButton>Adicionar Produto</NeonButton>
        <NeonButton variant="outline">Ativar Modo Demo</NeonButton>
      </div>
    </GlassCard>
  );
}
