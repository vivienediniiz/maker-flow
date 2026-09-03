"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CardRow } from "@/components/ui/CardRow";
import { NeonButton } from "@/components/ui/NeonButton";
import { SupplyModal } from "@/components/dashboard/SupplyModal";
import { RegisterSupplyPurchaseModal } from "@/components/dashboard/RegisterSupplyPurchaseModal";
import { SupplyMovementsHistory } from "@/components/dashboard/SupplyMovementsHistory";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import type { Supply } from "@/lib/types";

export function SuppliesRegistrationTab() {
  const supabase = createClient();
  const confirm = useConfirm();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTargetId, setPurchaseTargetId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    loadSupplies();
  }, []);

  async function loadSupplies() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("supplies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSupplies((data as Supply[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir este insumo? Essa ação não pode ser desfeita."))) return;
    setSupplies((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("supplies").delete().eq("id", id);
  }

  function openCreate() {
    setEditingSupply(null);
    setModalOpen(true);
  }

  function openEdit(supply: Supply) {
    setEditingSupply(supply);
    setModalOpen(true);
  }

  function handleSaved(supply: Supply) {
    setSupplies((prev) => {
      const exists = prev.some((s) => s.id === supply.id);
      return exists ? prev.map((s) => (s.id === supply.id ? supply : s)) : [supply, ...prev];
    });
  }

  function openPurchase(supplyId?: string) {
    setPurchaseTargetId(supplyId ?? null);
    setPurchaseModalOpen(true);
  }

  function handlePurchased(updatedSupply: Supply) {
    setSupplies((prev) => prev.map((s) => (s.id === updatedSupply.id ? updatedSupply : s)));
    setHistoryRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Insumos</h3>
        <div className="flex flex-wrap items-center gap-2">
          <NeonButton variant="outline" size="sm" onClick={() => openPurchase()} disabled={supplies.length === 0} className="whitespace-nowrap">
            <ShoppingCart size={14} /> Registrar Compra
          </NeonButton>
          <NeonButton size="sm" onClick={openCreate} className="whitespace-nowrap">
            <Plus size={14} /> Novo Insumo
          </NeonButton>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : supplies.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhum insumo cadastrado ainda. Clique em &quot;Novo Insumo&quot; pra começar.
        </GlassCard>
      ) : (
        <>
          {/* Desktop: tabela tradicional */}
          <GlassCard padding="none" className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Insumo</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Custo/unidade</th>
                    <th className="px-6 py-4 font-medium">Estoque</th>
                    <th className="w-24 px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((s) => {
                    const isLow = s.low_stock_threshold != null && s.stock_quantity < s.low_stock_threshold;
                    return (
                      <tr key={s.id} className="border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-text-primary">{s.name}</td>
                        <td className="px-6 py-4 text-text-secondary">{s.category || "—"}</td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">
                          {formatBRL(s.cost_per_unit)}/{s.unit}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("font-numeric", isLow ? "font-medium text-red-400" : "text-text-secondary")}>
                            {s.stock_quantity} {s.unit} {isLow && "· estoque baixo"}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center">
                            <button onClick={() => openPurchase(s.id)} className="p-2 text-text-muted hover:text-text-primary" aria-label="Registrar compra">
                              <ShoppingCart size={14} />
                            </button>
                            <button onClick={() => openEdit(s)} className="p-2 text-text-muted hover:text-text-primary" aria-label="Editar insumo">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 text-text-muted hover:text-red-400" aria-label="Excluir insumo">
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

          {/* Mobile: cards empilhados */}
          <div className="space-y-3 md:hidden">
            {supplies.map((s) => {
              const isLow = s.low_stock_threshold != null && s.stock_quantity < s.low_stock_threshold;
              return (
                <GlassCard key={s.id} padding="md" className="divide-y divide-border-glass/60">
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <p className="min-w-0 truncate text-base font-semibold text-text-primary">{s.name}</p>
                    <div className="-mr-2 -mt-2 flex shrink-0 items-center">
                      <button onClick={() => openPurchase(s.id)} className="p-2.5 text-text-muted hover:text-text-primary" aria-label="Registrar compra">
                        <ShoppingCart size={14} />
                      </button>
                      <button onClick={() => openEdit(s)} className="p-2.5 text-text-muted hover:text-text-primary" aria-label="Editar insumo">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2.5 text-text-muted hover:text-red-400" aria-label="Excluir insumo">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {s.category && <CardRow label="Categoria">{s.category}</CardRow>}
                  <CardRow label="Custo/unidade">
                    {formatBRL(s.cost_per_unit)}/{s.unit}
                  </CardRow>
                  <CardRow label="Estoque">
                    <span className={cn("font-numeric", isLow ? "font-medium text-red-400" : "text-text-secondary")}>
                      {s.stock_quantity} {s.unit} {isLow && "· baixo"}
                    </span>
                  </CardRow>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}

      <SupplyMovementsHistory supplies={supplies} refreshKey={historyRefreshKey} />

      <SupplyModal open={modalOpen} onClose={() => setModalOpen(false)} supply={editingSupply} onSaved={handleSaved} />
      <RegisterSupplyPurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        supplies={supplies}
        preselectedSupplyId={purchaseTargetId}
        onPurchased={handlePurchased}
      />
    </div>
  );
}
