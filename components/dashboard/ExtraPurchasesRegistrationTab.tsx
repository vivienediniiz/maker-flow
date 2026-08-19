"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ExtraPurchaseModal } from "@/components/dashboard/ExtraPurchaseModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { ExtraPurchase } from "@/lib/types";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function ExtraPurchasesRegistrationTab() {
  const supabase = createClient();
  const [purchases, setPurchases] = useState<ExtraPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<ExtraPurchase | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("extra_purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false });
    setPurchases((data as ExtraPurchase[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta compra? Essa ação não pode ser desfeita.")) return;
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("extra_purchases").delete().eq("id", id);
  }

  function openCreate() {
    setEditingPurchase(null);
    setModalOpen(true);
  }

  function openEdit(purchase: ExtraPurchase) {
    setEditingPurchase(purchase);
    setModalOpen(true);
  }

  function handleSaved(purchase: ExtraPurchase) {
    setPurchases((prev) => {
      const exists = prev.some((p) => p.id === purchase.id);
      return exists ? prev.map((p) => (p.id === purchase.id ? purchase : p)) : [purchase, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Compras Extras</h3>
        <NeonButton size="sm" onClick={openCreate} className="whitespace-nowrap">
          <Plus size={14} /> Nova Compra Extra
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma compra extra registrada ainda. Clique em &quot;Nova Compra Extra&quot; pra começar.
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium">Fornecedor</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="w-20 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-text-primary">{p.description}</td>
                    <td className="px-6 py-4 text-text-secondary">{p.category || "—"}</td>
                    <td className="px-6 py-4 text-text-secondary">{p.supplier || "—"}</td>
                    <td className="px-6 py-4 text-text-secondary">{formatDate(p.purchased_at)}</td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{formatBRL(p.amount)}</td>
                    <td className="px-2 py-4">
                      <div className="flex items-center">
                        <button onClick={() => openEdit(p)} className="p-2.5 text-text-muted hover:text-text-primary" aria-label="Editar compra">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2.5 text-text-muted hover:text-red-400" aria-label="Excluir compra">
                          <Trash2 size={14} />
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

      <ExtraPurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        purchase={editingPurchase}
        onSaved={handleSaved}
      />
    </div>
  );
}
