"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { SupplyModal } from "@/components/dashboard/SupplyModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import type { Supply } from "@/lib/types";

export function SuppliesRegistrationTab() {
  const supabase = createClient();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);

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
    if (!confirm("Excluir este insumo? Essa ação não pode ser desfeita.")) return;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Insumos</h3>
        <NeonButton size="sm" onClick={openCreate}>
          <Plus size={14} /> Novo Insumo
        </NeonButton>
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
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Insumo</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium">Custo/unidade</th>
                  <th className="px-6 py-4 font-medium">Estoque</th>
                  <th className="w-20 px-4 py-4" />
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
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(s)} className="text-text-muted hover:text-text-primary" aria-label="Editar insumo">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="text-text-muted hover:text-red-400" aria-label="Excluir insumo">
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

      <SupplyModal open={modalOpen} onClose={() => setModalOpen(false)} supply={editingSupply} onSaved={handleSaved} />
    </div>
  );
}
