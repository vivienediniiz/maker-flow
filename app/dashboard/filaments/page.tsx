"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, ShoppingCart, Trash2, Lock, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { FilamentModal } from "@/components/dashboard/FilamentModal";
import { RegisterFilamentPurchaseModal } from "@/components/dashboard/RegisterFilamentPurchaseModal";
import { FilamentGraduatedGauge } from "@/components/dashboard/FilamentGraduatedGauge";
import { AdjustFilamentStockInline } from "@/components/dashboard/AdjustFilamentStockInline";
import { FilamentMovementsHistory } from "@/components/dashboard/FilamentMovementsHistory";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { isFilamentLow } from "@/lib/filaments";
import type { Filament } from "@/lib/types";

export default function FilamentsPage() {
  const supabase = createClient();
  const { tier } = useSubscription();
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTargetId, setPurchaseTargetId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const canCreate = canCreateMore(tier, "filaments", filaments.length);

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
    if (!confirm("Excluir este filamento? O histórico de movimentações também será apagado. Essa ação não pode ser desfeita.")) return;
    setFilaments((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("filaments").delete().eq("id", id);
    setHistoryRefreshKey((k) => k + 1);
  }

  function openCreate() {
    setEditingFilament(null);
    setModalOpen(true);
  }

  function openEdit(filament: Filament) {
    setEditingFilament(filament);
    setModalOpen(true);
  }

  function openPurchase(filamentId?: string) {
    setPurchaseTargetId(filamentId ?? null);
    setPurchaseModalOpen(true);
  }

  function handleSaved(filament: Filament) {
    setFilaments((prev) => {
      const exists = prev.some((f) => f.id === filament.id);
      return exists ? prev.map((f) => (f.id === filament.id ? filament : f)) : [filament, ...prev];
    });
  }

  function handlePurchased(filament: Filament) {
    handleSaved(filament);
    setHistoryRefreshKey((k) => k + 1);
  }

  function handleAdjusted(filament: Filament) {
    handleSaved(filament);
    setHistoryRefreshKey((k) => k + 1);
  }

  return (
    <>
      <Topbar title="Filamentos" />
      <main className="space-y-8 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">Prateleira</h2>
            <p className="text-xs text-text-muted">Estoque de filamentos por combinação de marca, material e cor.</p>
          </div>
          <div className="flex gap-2">
            <NeonButton variant="outline" size="sm" onClick={() => openPurchase()} disabled={filaments.length === 0}>
              <ShoppingCart size={14} /> Registrar Compra
            </NeonButton>
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
        </div>

        {!canCreate && (
          <p className="-mt-4 text-xs text-amber-400">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filaments.map((f) => {
              const low = isFilamentLow(f);
              return (
                <GlassCard
                  key={f.id}
                  hover
                  padding="md"
                  className={cn(
                    "relative flex flex-col items-center gap-3 pt-9 text-center",
                    low && "border-amber-500/50 ring-1 ring-amber-500/30"
                  )}
                >
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
                    <button onClick={() => openEdit(f)} className="p-2 text-text-muted hover:text-text-primary" aria-label="Editar filamento">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-2 text-text-muted hover:text-red-400" aria-label="Excluir filamento">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <FilamentGraduatedGauge colorHex={f.color_hex} remainingG={f.remaining_weight_g} totalG={f.weight_total_g} />

                  <div>
                    <p className="text-sm font-medium text-text-primary">{f.material}</p>
                    <p className="text-xs text-text-muted">{f.brand}</p>
                  </div>

                  {low && (
                    <span className="inline-flex items-center gap-1 rounded-pill border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                      <AlertTriangle size={11} /> Estoque baixo
                    </span>
                  )}

                  <p className="text-xs text-text-secondary">
                    {f.remaining_weight_g}g / {f.weight_total_g}g
                  </p>

                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 text-left">
                      <AdjustFilamentStockInline filament={f} onAdjusted={handleAdjusted} />
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">{formatBRL(f.price_per_kg)}/kg</span>
                  </div>

                  <button
                    onClick={() => openPurchase(f.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-pill border border-border-glassStrong py-2 text-xs font-medium text-text-secondary transition-colors hover:border-neon-pink/60 hover:text-text-primary"
                  >
                    <ShoppingCart size={12} /> Registrar Compra
                  </button>
                </GlassCard>
              );
            })}
          </div>
        )}

        <FilamentMovementsHistory filaments={filaments} refreshKey={historyRefreshKey} />
      </main>

      <FilamentModal open={modalOpen} onClose={() => setModalOpen(false)} filament={editingFilament} onSaved={handleSaved} />
      <RegisterFilamentPurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        filaments={filaments}
        preselectedFilamentId={purchaseTargetId}
        onPurchased={handlePurchased}
      />
    </>
  );
}
