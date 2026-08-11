"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { SlidersHorizontal, PackagePlus, Sparkles, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"catalog" | "projects">("catalog");
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];
  const filtered = categoryFilter ? products.filter((p) => p.category === categoryFilter) : products;

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
                  {categories.length === 0 && (
                    <p className="text-xs text-text-muted">Nenhuma categoria ainda.</p>
                  )}
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="radio"
                      name="category"
                      checked={categoryFilter === null}
                      onChange={() => setCategoryFilter(null)}
                      className="accent-[#FF4EDF]"
                    />
                    Todas
                  </label>
                  {categories.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="radio"
                        name="category"
                        checked={categoryFilter === c}
                        onChange={() => setCategoryFilter(c)}
                        className="accent-[#FF4EDF]"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <NeonButton size="sm" onClick={() => setModalOpen(true)}>
              <PackagePlus size={14} /> Novo Produto
            </NeonButton>
          </div>
        </div>

        {tab === "catalog" ? (
          loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const profit = p.sale_price - p.cost_price;
                const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
                return (
                  <GlassCard key={p.id} hover padding="md" className="space-y-3">
                    <div className="flex h-28 items-center justify-center rounded-xl bg-neon-gradient-soft">
                      <span className="text-3xl">🧩</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.category || "Sem categoria"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Custo médio" value={formatBRL(p.cost_price)} />
                      <Stat label="Venda" value={formatBRL(p.sale_price)} />
                      <Stat label="Lucro" value={formatBRL(profit)} accent="green" />
                      <Stat label="Margem" value={`${margin.toFixed(0)}%`} accent="pink" />
                    </div>
                    <p className="text-[11px] text-text-muted">{p.stock_quantity} em estoque</p>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <EmptyState onAdd={() => setModalOpen(true)} />
          )
        ) : (
          <GlassCard padding="lg" className="text-sm text-text-secondary">
            Lista de todos os projetos (orçados e em produção) aparece aqui, unificando catálogo e histórico de orçamentos.
          </GlassCard>
        )}
      </main>

      <NewProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(product) => setProducts((prev) => [product, ...prev])}
      />
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <GlassCard padding="lg" className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient shadow-neon-glow">
        <Sparkles size={22} className="text-white" />
      </div>
      <div>
        <p className="font-display text-lg">Seu catálogo está vazio</p>
        <p className="text-sm text-text-muted">Adicione seu primeiro produto pra começar.</p>
      </div>
      <NeonButton onClick={onAdd}>Adicionar Produto</NeonButton>
    </GlassCard>
  );
}