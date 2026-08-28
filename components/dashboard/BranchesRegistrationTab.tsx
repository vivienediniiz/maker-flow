"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { BranchModal } from "@/components/dashboard/BranchModal";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import type { Branch } from "@/lib/types";

export function BranchesRegistrationTab() {
  const supabase = createClient();
  const confirm = useConfirm();
  const { tier } = useSubscription();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const canCreate = canCreateMore(tier, "branches", branches.length);

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
    if (!(await confirm("Excluir esta filial? Essa ação não pode ser desfeita."))) return;
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Filiais</h3>
        <NeonButton
          size="sm"
          onClick={() => canCreate && openCreate()}
          disabled={!canCreate}
          className={cn("whitespace-nowrap", !canCreate && "opacity-40")}
          title={!canCreate ? "Plano Grátis permite só a matriz" : undefined}
        >
          {canCreate ? <Plus size={14} /> : <Lock size={14} />} Nova Filial
        </NeonButton>
      </div>

      {!canCreate && (
        <p className="text-xs text-amber-400">
          Seu plano permite só {limitFor(tier, "branches")} filia{limitFor(tier, "branches") === 1 ? "l" : "is"}.{" "}
          <a href="/dashboard/subscription" className="underline hover:text-amber-300">
            Assine um plano maior
          </a>{" "}
          pra cadastrar mais.
        </p>
      )}

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
                <div className="-mr-1.5 -mt-1.5 flex items-center">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-text-muted hover:text-text-primary" aria-label="Editar filial">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 text-text-muted hover:text-red-400" aria-label="Excluir filial">
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
