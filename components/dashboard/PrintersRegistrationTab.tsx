"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CardRow } from "@/components/ui/CardRow";
import { NeonButton } from "@/components/ui/NeonButton";
import { PrinterAssetModal } from "@/components/dashboard/PrinterAssetModal";
import { PrinterAssetDetailModal } from "@/components/dashboard/PrinterAssetDetailModal";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import {
  PRINTER_ASSET_STATUS_LABELS,
  PRINTER_ASSET_STATUS_STYLES,
  WARRANTY_BADGE,
  warrantyState,
} from "@/lib/printerAssets";
import type { PrinterAsset } from "@/lib/types";

type PrinterAssetRow = PrinterAsset & { branches: { name: string } | null };

export function PrintersRegistrationTab() {
  const supabase = createClient();
  const confirm = useConfirm();
  const { tier } = useSubscription();
  const [assets, setAssets] = useState<PrinterAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PrinterAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<PrinterAssetRow | null>(null);
  const canCreate = canCreateMore(tier, "printers", assets.length);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("printer_assets")
      .select("*, branches(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAssets((data as PrinterAssetRow[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!(await confirm("Excluir esta impressora? O histórico de manutenção também será apagado. Essa ação não pode ser desfeita."))) return;
    setAssets((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("printer_assets").delete().eq("id", id);
  }

  function openCreate() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEdit(asset: PrinterAsset, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingAsset(asset);
    setModalOpen(true);
  }

  function handleSaved(asset: PrinterAsset) {
    setAssets((prev) => {
      const exists = prev.some((a) => a.id === asset.id);
      if (exists) return prev.map((a) => (a.id === asset.id ? { ...a, ...asset } : a));
      return [{ ...asset, branches: null }, ...prev];
    });
    loadAssets();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Impressoras</h3>
        <NeonButton
          size="sm"
          onClick={() => canCreate && openCreate()}
          disabled={!canCreate}
          className={cn("whitespace-nowrap", !canCreate && "opacity-40")}
          title={!canCreate ? "Limite de impressoras do seu plano atingido" : undefined}
        >
          {canCreate ? <Plus size={14} /> : <Lock size={14} />} Nova Impressora
        </NeonButton>
      </div>

      {!canCreate && (
        <p className="text-xs text-amber-400">
          Seu plano permite só {limitFor(tier, "printers")} impressora{limitFor(tier, "printers") === 1 ? "" : "s"} cadastrada
          {limitFor(tier, "printers") === 1 ? "" : "s"}.{" "}
          <a href="/dashboard/subscription" className="underline hover:text-amber-300">
            Assine um plano
          </a>{" "}
          pra cadastrar mais.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma impressora cadastrada ainda. Clique em &quot;Nova Impressora&quot; pra começar.
        </GlassCard>
      ) : (
        <>
          {/* Desktop: tabela tradicional */}
          <GlassCard padding="none" className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Impressora</th>
                    <th className="px-6 py-4 font-medium">Filial</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Data da compra</th>
                    <th className="w-20 px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => {
                    const warranty = warrantyState(a.warranty_expiry_date);
                    const warrantyBadge = WARRANTY_BADGE[warranty];
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setDetailAsset(a)}
                        className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-text-primary">{a.model}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {a.serial_number && <p className="text-xs text-text-muted">{a.serial_number}</p>}
                            {warrantyBadge && (
                              <span className={cn("rounded-pill border px-2 py-0.5 text-[10px] font-medium", warrantyBadge.className)}>
                                {warrantyBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{a.branches?.name ?? "—"}</td>
                        <td className="px-6 py-4">
                          <span className={cn("rounded-pill border px-2.5 py-1 text-[11px] font-medium", PRINTER_ASSET_STATUS_STYLES[a.status])}>
                            {PRINTER_ASSET_STATUS_LABELS[a.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">
                          {a.purchase_date ? new Date(a.purchase_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={(e) => openEdit(a, e)}
                              className="p-2.5 text-text-muted hover:text-text-primary"
                              aria-label="Editar impressora"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(a.id, e)}
                              className="p-2.5 text-text-muted hover:text-red-400"
                              aria-label="Excluir impressora"
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

          {/* Mobile: cards empilhados */}
          <div className="space-y-3 md:hidden">
            {assets.map((a) => {
              const warranty = warrantyState(a.warranty_expiry_date);
              const warrantyBadge = WARRANTY_BADGE[warranty];
              return (
                <GlassCard
                  key={a.id}
                  hover
                  padding="md"
                  className="cursor-pointer divide-y divide-border-glass/60"
                  onClick={() => setDetailAsset(a)}
                >
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-text-primary">{a.model}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {a.serial_number && <p className="text-xs text-text-muted">{a.serial_number}</p>}
                        {warrantyBadge && (
                          <span className={cn("rounded-pill border px-2 py-0.5 text-[10px] font-medium", warrantyBadge.className)}>
                            {warrantyBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="-mr-2 -mt-2 flex shrink-0 items-center">
                      <button
                        onClick={(e) => openEdit(a, e)}
                        className="p-2.5 text-text-muted hover:text-text-primary"
                        aria-label="Editar impressora"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(a.id, e)}
                        className="p-2.5 text-text-muted hover:text-red-400"
                        aria-label="Excluir impressora"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <CardRow label="Filial">{a.branches?.name ?? "—"}</CardRow>
                  <CardRow label="Status">
                    <span className={cn("rounded-pill border px-2.5 py-1 text-[11px] font-medium", PRINTER_ASSET_STATUS_STYLES[a.status])}>
                      {PRINTER_ASSET_STATUS_LABELS[a.status]}
                    </span>
                  </CardRow>
                  <CardRow label="Data da compra">
                    {a.purchase_date ? new Date(a.purchase_date).toLocaleDateString("pt-BR") : "—"}
                  </CardRow>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}

      <PrinterAssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        asset={editingAsset}
        onSaved={handleSaved}
      />
      <PrinterAssetDetailModal
        asset={detailAsset}
        branch={detailAsset?.branches ?? null}
        onClose={() => setDetailAsset(null)}
      />
    </div>
  );
}
