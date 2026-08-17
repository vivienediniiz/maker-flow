"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { FilamentModal } from "@/components/dashboard/FilamentModal";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { canCreateMore, limitFor, hasFeature } from "@/lib/entitlements";
import type { Filament } from "@/lib/types";

export function FilamentsRegistrationTab() {
  const supabase = createClient();
  const { tier } = useSubscription();
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const canCreate = canCreateMore(tier, "filaments", filaments.length);
  const showLowStockAlert = hasFeature(tier);

  useEffect(() => {
    loadFilaments();
  }, []);

  async function loadFilaments() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("filaments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFilaments((data as Filament[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este filamento? Essa ação não pode ser desfeita.")) return;
    setFilaments((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("filaments").delete().eq("id", id);
  }

  function openCreate() {
    setEditingFilament(null);
    setModalOpen(true);
  }

  function openEdit(filament: Filament) {
    setEditingFilament(filament);
    setModalOpen(true);
  }

  function handleSaved(filament: Filament) {
    setFilaments((prev) => {
      const exists = prev.some((f) => f.id === filament.id);
      return exists ? prev.map((f) => (f.id === filament.id ? filament : f)) : [filament, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Filamentos</h3>
        <NeonButton
          size="sm"
          onClick={() => canCreate && openCreate()}
          disabled={!canCreate}
          className={!canCreate ? "opacity-40" : undefined}
          title={!canCreate ? `Limite do plano Grátis (${limitFor(tier, "filaments")} rolos) atingido` : undefined}
        >
          {canCreate ? <Plus size={14} /> : <Lock size={14} />} Novo Filamento
        </NeonButton>
      </div>

      {!canCreate && (
        <p className="text-xs text-amber-400">
          Você atingiu o limite de {limitFor(tier, "filaments")} rolos do plano Grátis.{" "}
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
      ) : filaments.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhum filamento cadastrado ainda. Clique em &quot;Novo Filamento&quot; pra começar.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filaments.map((f) => {
            const total = f.weight_total_g > 0 ? f.weight_total_g : 1000;
            const fillPercent = Math.min(100, (f.remaining_weight_g / total) * 100);
            const isLow = f.remaining_weight_g < 150 || fillPercent < 15;
            return (
              <GlassCard key={f.id} hover padding="md" className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: f.color_hex }}
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{f.material}</p>
                      <p className="text-xs text-text-muted">{f.brand}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(f)} className="text-text-muted hover:text-text-primary" aria-label="Editar filamento">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="text-text-muted hover:text-red-400" aria-label="Excluir filamento">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/5">
                  <div
                    className="h-full rounded-pill bg-neon-gradient transition-all"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={isLow && showLowStockAlert ? "font-medium text-red-400" : "text-text-secondary"}>
                    {f.remaining_weight_g}g / {total}g {isLow && showLowStockAlert && "· estoque baixo"}
                  </span>
                  <span className="text-text-muted">{formatBRL(f.price_per_kg)}/kg</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <FilamentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filament={editingFilament}
        onSaved={handleSaved}
      />
    </div>
  );
}
