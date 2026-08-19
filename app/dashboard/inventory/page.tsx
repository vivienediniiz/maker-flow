"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { AddStockModal } from "@/components/dashboard/AddStockModal";
import { QuickSaleModal } from "@/components/dashboard/QuickSaleModal";
import { EditStockQuantityModal } from "@/components/dashboard/EditStockQuantityModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { isProductLow } from "@/lib/products";
import { PackagePlus, ShoppingBag, Loader2, Pencil, AlertTriangle } from "lucide-react";
import type { Product } from "@/lib/types";

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [saleTarget, setSaleTarget] = useState<Product | null>(null);
  const [editingStock, setEditingStock] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: productsData } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");

    setProducts((productsData as Product[]) ?? []);
    setLoading(false);
  }

  // Estoque é pra quem trabalha com pronta entrega — só mostra produtos com estoque > 0
  // (ou que já tiveram estoque lançado). Produtos feitos só sob encomenda não aparecem aqui.
  const inStock = products.filter((p) => p.stock_quantity > 0);
  const lowStockItems = inStock.filter(isProductLow);

  return (
    <>
      <Topbar title="Estoque" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <NeonButton onClick={() => setAddStockOpen(true)}>
            <PackagePlus size={16} /> Adicionar Estoque
          </NeonButton>
        </div>

        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            <AlertTriangle size={16} className="shrink-0" />
            {lowStockItems.length === 1
              ? `1 produto está com estoque baixo: ${lowStockItems[0].name}.`
              : `${lowStockItems.length} produtos estão com estoque baixo: ${lowStockItems.map((p) => p.name).join(", ")}.`}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : inStock.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            Nenhum produto com estoque lançado ainda. Clique em &quot;Adicionar Estoque&quot; e
            selecione um produto já cadastrado no catálogo.
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Produto</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Preço</th>
                    <th className="px-6 py-4 font-medium">Estoque</th>
                    <th className="w-52 px-6 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {inStock.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => p.stock_quantity > 0 && setSaleTarget(p)}
                      className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-base">📦</span>
                            )}
                          </div>
                          <span className="font-medium text-text-primary">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{p.category || "Sem categoria"}</td>
                      <td className="px-6 py-4 font-numeric font-semibold text-neon-pink">
                        {formatBRL(p.sale_price)}
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        <div className="flex items-center gap-2">
                          <span>{p.stock_quantity} disponíveis</span>
                          {isProductLow(p) && (
                            <span
                              className="inline-flex items-center gap-1 rounded-pill border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
                              title={`Limite configurado: ${p.low_stock_threshold}`}
                            >
                              <AlertTriangle size={10} /> Baixo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSaleTarget(p);
                            }}
                            className="neon-btn flex-1 justify-center py-2 text-xs"
                            disabled={p.stock_quantity === 0}
                          >
                            <ShoppingBag size={13} /> Registrar venda
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingStock(p);
                            }}
                            className="shrink-0 text-text-muted hover:text-neon-pink"
                            aria-label="Editar estoque"
                            title="Editar estoque"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>

      <AddStockModal
        open={addStockOpen}
        onClose={() => setAddStockOpen(false)}
        onUpdated={(updated) => {
          setProducts((prev) => {
            const exists = prev.some((p) => p.id === updated.id);
            return exists ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated];
          });
        }}
      />

      {saleTarget && (
        <QuickSaleModal
          open={!!saleTarget}
          onClose={() => setSaleTarget(null)}
          productId={saleTarget.id}
          itemName={saleTarget.name}
          unitPrice={saleTarget.sale_price}
          maxQuantity={saleTarget.stock_quantity}
          onConfirm={({ quantity, stockAdjustedAutomatically }) => {
            if (stockAdjustedAutomatically) {
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === saleTarget.id ? { ...p, stock_quantity: p.stock_quantity - quantity } : p
                )
              );
            } else {
              alert(
                "Venda registrada. No plano Grátis a baixa de estoque é manual — ajuste a quantidade em Produtos."
              );
            }
            loadData();
          }}
        />
      )}

      <EditStockQuantityModal
        product={editingStock}
        onClose={() => setEditingStock(null)}
        onUpdated={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />
    </>
  );
}
