"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { NeonButton } from "@/components/ui/NeonButton";
import { AddStockModal } from "@/components/dashboard/AddStockModal";
import { QuickSaleModal } from "@/components/dashboard/QuickSaleModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { PackagePlus, ShoppingBag, Loader2 } from "lucide-react";
import type { Product, Sale } from "@/lib/types";

export default function InventoryPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [saleTarget, setSaleTarget] = useState<Product | null>(null);

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

    const [{ data: productsData }, { data: salesData }] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id).order("name"),
      supabase.from("sales").select("*").eq("user_id", user.id).order("sold_at", { ascending: false }),
    ]);

    setProducts((productsData as Product[]) ?? []);
    setSales((salesData as Sale[]) ?? []);
    setLoading(false);
  }

  // Estoque é pra quem trabalha com pronta entrega — só mostra produtos com estoque > 0
  // (ou que já tiveram estoque lançado). Produtos feitos só sob encomenda não aparecem aqui.
  const inStock = products.filter((p) => p.stock_quantity > 0);

  return (
    <>
      <Topbar title="Estoque 3D & Vendas" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "stock", label: "Produtos em Estoque" },
              { value: "history", label: "Histórico de Vendas" },
            ]}
          />
          {tab === "stock" && (
            <NeonButton onClick={() => setAddStockOpen(true)}>
              <PackagePlus size={16} /> Adicionar Estoque
            </NeonButton>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : tab === "stock" ? (
          inStock.length === 0 ? (
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
                      <th className="w-44 px-6 py-4" />
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
                        <td className="px-6 py-4 text-text-secondary">{p.stock_quantity} disponíveis</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSaleTarget(p);
                            }}
                            className="neon-btn w-full justify-center py-2 text-xs"
                            disabled={p.stock_quantity === 0}
                          >
                            <ShoppingBag size={13} /> Registrar venda
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )
        ) : sales.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            Nenhuma venda registrada ainda.
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Qtd.</th>
                  <th className="px-6 py-4 font-medium">Canal</th>
                  <th className="px-6 py-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border-glass/60">
                    <td className="px-6 py-4 text-text-primary">{s.product_name}</td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(s.sold_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{s.quantity}</td>
                    <td className="px-6 py-4 capitalize text-text-secondary">{s.channel}</td>
                    <td className="px-6 py-4 text-right font-numeric font-medium text-text-primary">
                      {formatBRL(s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            loadData(); // recarrega pra atualizar o histórico de vendas também
          }}
        />
      )}
    </>
  );
}