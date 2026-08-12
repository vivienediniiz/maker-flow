"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { BranchModal } from "@/components/dashboard/BranchModal";
import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/lib/types";

export function BranchesRegistrationTab() {
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBranches((data as Branch[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta filial? Essa ação não pode ser desfeita.")) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("branches").delete().eq("id", id);
  }

  function openCreate() {
    setEditingBranch(null);
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    setModalOpen(true);
  }

  function handleSaved(branch: Branch) {
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      return exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [branch, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Filiais</h3>
        <NeonButton size="sm" onClick={openCreate}>
          <Plus size={14} /> Nova Filial
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma filial cadastrada ainda. Clique em &quot;Nova Filial&quot; pra começar.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <GlassCard key={b.id} hover padding="md" className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{b.name}</p>
                  <p className="text-xs text-text-muted">{b.type === "matriz" ? "Matriz" : "Filial"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(b)} className="text-text-muted hover:text-text-primary" aria-label="Editar filial">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="text-text-muted hover:text-red-400" aria-label="Excluir filial">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {b.address && <p className="text-xs text-text-secondary">{b.address}</p>}
            </GlassCard>
          ))}
        </div>
      )}

      <BranchModal open={modalOpen} onClose={() => setModalOpen(false)} branch={editingBranch} onSaved={handleSaved} />
    </div>
  );
}
