"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { CardRow } from "@/components/ui/CardRow";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { ProductDetailModal } from "@/components/dashboard/ProductDetailModal";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import { Toggle } from "@/components/ui/Toggle";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { SlidersHorizontal, PackagePlus, Sparkles, Loader2, Trash2, Lock, Pencil, FileDown, X, ChevronUp, ChevronDown } from "lucide-react";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const supabase = createClient();
  const { tier } = useSubscription();
  const confirm = useConfirm();
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
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

  async function handleToggleInStore(product: Product) {
    const turningOn = !product.in_store;
    let order = product.store_display_order;
    if (turningOn && order == null) {
      const maxOrder = products.reduce(
        (max, p) => (p.in_store && p.store_display_order != null ? Math.max(max, p.store_display_order) : max),
        0
      );
      order = maxOrder + 1;
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, in_store: turningOn, store_display_order: order } : p)));
    await supabase.from("products").update({ in_store: turningOn, store_display_order: order }).eq("id", product.id);
  }

  async function handleMoveInStore(product: Product, direction: "up" | "down") {
    const storeItems = products
      .filter((p) => p.in_store)
      .sort((a, b) => (a.store_display_order ?? 0) - (b.store_display_order ?? 0));
    const idx = storeItems.findIndex((p) => p.id === product.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= storeItems.length) return;

    const other = storeItems[swapIdx];
    const aOrder = product.store_display_order ?? 0;
    const bOrder = other.store_display_order ?? 0;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === product.id) return { ...p, store_display_order: bOrder };
        if (p.id === other.id) return { ...p, store_display_order: aOrder };
        return p;
      })
    );

    await Promise.all([
      supabase.from("products").update({ store_display_order: bOrder }).eq("id", product.id),
      supabase.from("products").update({ store_display_order: aOrder }).eq("id", other.id),
    ]);
  }

  async function handleDelete(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!(await confirm("Excluir este produto? Essa ação não pode ser desfeita."))) return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    await supabase.from("products").delete().eq("id", productId);
  }

  const filtered = products
    .filter((p) => (categoryFilter ? p.category === categoryFilter : true))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  function toggleSelected(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!(await confirm(`Excluir ${ids.length} produto${ids.length > 1 ? "s" : ""} selecionado${ids.length > 1 ? "s" : ""}? Essa ação não pode ser desfeita.`))) {
      return;
    }
    setBulkDeleting(true);
    const { error } = await supabase.from("products").delete().in("id", ids);
    setBulkDeleting(false);
    if (error) {
      alert("Não foi possível excluir os produtos selecionados. Tente novamente.");
      return;
    }
    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  }

  async function handleGenerateCatalog() {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return;

    setGeneratingCatalog(true);
    let container: HTMLDivElement | null = null;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("studio_name, full_name")
        .eq("id", user!.id)
        .single();
      const studioName = profile?.studio_name || profile?.full_name || "Meu Estúdio";

      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.padding = "40px";
      container.style.fontFamily = "'Segoe UI', Arial, sans-serif";
      container.style.background = "#FFFFFF";
      container.style.color = "#1A1625";

      const itemsHtml = selectedProducts
        .map(
          (p) => `
        <div style="display:flex; gap:16px; border:1px solid #EEE6F2; border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="width:110px; height:110px; border-radius:8px; overflow:hidden; flex-shrink:0; background:linear-gradient(135deg,#E86333,#FF4EDF,#AA17DB); display:flex; align-items:center; justify-content:center;">
            ${p.image_url ? `<img src="${p.image_url}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-size:32px;">🧩</span>`}
          </div>
          <div style="flex:1; min-width:0;">
            <p style="margin:0; font-size:16px; font-weight:700;">${p.name}</p>
            ${p.category ? `<p style="margin:2px 0 0; font-size:11px; color:#AA17DB; font-weight:600; text-transform:uppercase;">${p.category}</p>` : ""}
            ${p.description ? `<p style="margin:8px 0 0; font-size:12px; color:#3A3548; line-height:1.4;">${p.description}</p>` : ""}
            <p style="margin:10px 0 0; font-size:20px; font-weight:800; color:#FF4EDF;">${formatBRL(p.sale_price)}</p>
          </div>
        </div>
      `
        )
        .join("");

      container.innerHTML = `
        <div style="text-align:center; border-bottom:3px solid #FF4EDF; padding-bottom:16px; margin-bottom:24px;">
          <p style="margin:0; font-size:24px; font-weight:700;">${studioName}</p>
          <p style="margin:4px 0 0; font-size:12px; letter-spacing:0.08em; color:#AA17DB; font-weight:600;">CATÁLOGO DE PRODUTOS</p>
        </div>
        ${itemsHtml}
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#FFFFFF" });
      const imgData = canvas.toDataURL("image/png");

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        let position = 0;
        while (remainingHeight > 0) {
          doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          remainingHeight -= pageHeight;
          position -= pageHeight;
          if (remainingHeight > 0) doc.addPage();
        }
      }

      doc.save(`catalogo-produtos-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      if (container) document.body.removeChild(container);
      setGeneratingCatalog(false);
    }
  }

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
              title={!canCreate ? `Limite do seu plano (${limitFor(tier, "products")} produtos) atingido` : undefined}
            >
              {canCreate ? <PackagePlus size={14} /> : <Lock size={14} />} Novo Produto
            </NeonButton>
          </div>
        </div>

        {!canCreate && (
          <p className="text-xs text-amber-400">
            Você atingiu o limite de {limitFor(tier, "products")} produtos do seu plano.{" "}
            <a href="/dashboard/subscription" className="underline hover:text-amber-300">
              Assine um plano maior
            </a>{" "}
            pra cadastrar mais.
          </p>
        )}

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neon-pink/30 bg-neon-pink/[0.06] px-4 py-3">
            <p className="text-xs font-medium text-text-primary">
              {selectedIds.size} produto{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <NeonButton variant="outline" size="sm" onClick={handleGenerateCatalog} disabled={generatingCatalog}>
                {generatingCatalog ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Gerar
                Catálogo PDF
              </NeonButton>
              <NeonButton variant="outline" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                Selecionados
              </NeonButton>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text-primary"
                aria-label="Limpar seleção"
                title="Limpar seleção"
              >
                <X size={14} />
              </button>
            </div>
          </div>
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
          <>
            {/* Desktop: tabela tradicional */}
            <GlassCard padding="none" className="hidden overflow-hidden md:block">
              <div className="overflow-x-auto scrollbar-glass">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                      <th className="w-10 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="accent-[#FF4EDF]"
                          aria-label="Selecionar todos os produtos filtrados"
                        />
                      </th>
                      <th className="px-6 py-4 font-medium">Produto</th>
                      <th className="px-6 py-4 font-medium">Categoria</th>
                      <th className="px-6 py-4 font-medium">Custo</th>
                      <th className="px-6 py-4 font-medium">Venda</th>
                      <th className="px-6 py-4 font-medium">Margem</th>
                      <th className="px-6 py-4 font-medium">Estoque</th>
                      <th className="px-6 py-4 font-medium">Loja</th>
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
                          className={cn(
                            "cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]",
                            selectedIds.has(p.id) && "bg-neon-pink/[0.04]"
                          )}
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleSelected(p.id)}
                              className="accent-[#FF4EDF]"
                              aria-label={`Selecionar ${p.name}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
                                {p.image_url ? (
                                  <Image src={p.image_url} alt="" width={40} height={40} className="h-full w-full object-cover" />
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
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Toggle checked={p.in_store} onChange={() => handleToggleInStore(p)} />
                              {p.in_store && (
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => handleMoveInStore(p, "up")}
                                    className="text-text-muted hover:text-text-primary"
                                    aria-label="Mover pra cima na loja"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveInStore(p, "down")}
                                    className="text-text-muted hover:text-text-primary"
                                    aria-label="Mover pra baixo na loja"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-4">
                            <div className="flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProduct(p);
                                }}
                                className="p-2.5 text-text-muted hover:text-neon-pink"
                                aria-label="Editar produto"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(p.id, e)}
                                className="p-2.5 text-text-muted hover:text-red-400"
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

            {/* Mobile: cards recolhíveis */}
            <div className="space-y-3 md:hidden">
              {filtered.map((p) => {
                const profit = p.sale_price - p.cost_price;
                const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
                return (
                  <CollapsibleCard
                    key={p.id}
                    className={selectedIds.has(p.id) ? "bg-neon-pink/[0.04]" : undefined}
                    header={
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="shrink-0 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelected(p.id)}
                            className="h-[18px] w-[18px] accent-[#FF4EDF]"
                            aria-label={`Selecionar ${p.name}`}
                          />
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
                          {p.image_url ? (
                            <Image src={p.image_url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-base">🧩</span>
                          )}
                        </div>
                        <p className="min-w-0 truncate text-base font-semibold text-text-primary">{p.name}</p>
                      </div>
                    }
                    actions={
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(p);
                          }}
                          className="p-2.5 text-text-muted hover:text-neon-pink"
                          aria-label="Editar produto"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          className="p-2.5 text-text-muted hover:text-red-400"
                          aria-label="Excluir produto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    }
                  >
                    {p.category && <CardRow label="Categoria">{p.category}</CardRow>}
                    <CardRow label="Custo">{formatBRL(p.cost_price)}</CardRow>
                    <CardRow label="Venda">{formatBRL(p.sale_price)}</CardRow>
                    <CardRow label="Margem">
                      <span className="text-neon-pink">{margin.toFixed(0)}%</span>
                    </CardRow>
                    <CardRow label="Estoque">{p.stock_quantity}</CardRow>
                    <CardRow label="Exibir na Loja">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Toggle checked={p.in_store} onChange={() => handleToggleInStore(p)} />
                        {p.in_store && (
                          <>
                            <button
                              onClick={() => handleMoveInStore(p, "up")}
                              className="text-text-muted hover:text-text-primary"
                              aria-label="Mover pra cima na loja"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              onClick={() => handleMoveInStore(p, "down")}
                              className="text-text-muted hover:text-text-primary"
                              aria-label="Mover pra baixo na loja"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </CardRow>
                  </CollapsibleCard>
                );
              })}
            </div>
          </>
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