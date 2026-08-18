"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { ProductDetailModal } from "@/components/dashboard/ProductDetailModal";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { SlidersHorizontal, PackagePlus, Sparkles, Loader2, Trash2, Lock, Pencil } from "lucide-react";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const supabase = createClient();
  const { tier } = useSubscription();
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const canCreate = canCreateMore(tier, "products", products.length);

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

  async function handleDelete(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir este produto? Essa ação não pode ser desfeita.")) return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    await supabase.from("products").delete().eq("id", productId);
  }
  const filtered = products
    .filter((p) => (categoryFilter ? p.category === categoryFilter : true))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Topbar
        title="Produtos e Catálogo"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar produto por nome..."
      />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-lg">Catálogo de Produtos</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <NeonButton variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
                <SlidersHorizontal size={14} /> Filtros
              </NeonButton>
              {showFilters && (
                <div className="glass-card absolute right-0 top-12 z-20 w-56 space-y-3 p-4 shadow-neon-glow">
                  <p className="text-xs text-text-muted">Categoria</p>
                  {categories.length === 0 && <p className="text-xs text-text-muted">Nenhuma categoria ainda.</p>}
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
            <NeonButton
              size="sm"
              onClick={() => canCreate && setModalOpen(true)}
              disabled={!canCreate}
              className={!canCreate ? "opacity-40" : undefined}
              title={!canCreate ? `Limite do plano Grátis (${limitFor(tier, "products")} produtos) atingido` : undefined}
            >
              {canCreate ? <PackagePlus size={14} /> : <Lock size={14} />} Novo Produto
            </NeonButton>
          </div>
        </div>

        {!canCreate && (
          <p className="text-xs text-amber-400">
            Você atingiu o limite de {limitFor(tier, "products")} produtos do plano Grátis.{" "}
            <a href="/dashboard/subscription" className="underline hover:text-amber-300">
              Assine um plano
            </a>{" "}
            pra cadastrar sem limite.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          products.length === 0 ? (
            <EmptyState onAdd={() => setModalOpen(true)} />
          ) : (
            <GlassCard padding="lg" className="text-center text-sm text-text-muted">
              Nenhum produto encontrado para essa busca/filtro.
            </GlassCard>
          )
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Produto</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Custo</th>
                    <th className="px-6 py-4 font-medium">Venda</th>
                    <th className="px-6 py-4 font-medium">Margem</th>
                    <th className="px-6 py-4 font-medium">Estoque</th>
                    <th className="w-12 px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const profit = p.sale_price - p.cost_price;
                    const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-base">🧩</span>
                              )}
                            </div>
                            <span className="font-medium text-text-primary">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{p.category || "—"}</td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">{formatBRL(p.cost_price)}</td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">{formatBRL(p.sale_price)}</td>
                        <td className="px-6 py-4 font-numeric text-neon-pink">{margin.toFixed(0)}%</td>
                        <td className="px-6 py-4 text-text-secondary">{p.stock_quantity}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(p);
                              }}
                              className="text-text-muted hover:text-neon-pink"
                              aria-label="Editar produto"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(p.id, e)}
                              className="text-text-muted hover:text-red-400"
                              aria-label="Excluir produto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>

      <NewProductModal
        open={modalOpen || !!editingProduct}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onCreated={(product) =>
          setProducts((prev) =>
            editingProduct
              ? prev.map((p) => (p.id === product.id ? product : p))
              : [product, ...prev]
          )
        }
      />
      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
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