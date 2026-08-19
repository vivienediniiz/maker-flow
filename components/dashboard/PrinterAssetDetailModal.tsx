"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, ExternalLink, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { MaintenanceLogModal } from "@/components/dashboard/MaintenanceLogModal";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBRL } from "@/lib/utils";
import {
  PRINTER_ASSET_STATUS_LABELS,
  PRINTER_ASSET_STATUS_STYLES,
  WARRANTY_BADGE,
  warrantyState,
} from "@/lib/printerAssets";
import type { PrinterAsset, PrinterMaintenanceLog } from "@/lib/types";

interface PrinterAssetDetailModalProps {
  asset: PrinterAsset | null;
  branch: { name: string } | null;
  onClose: () => void;
}

export function PrinterAssetDetailModal({ asset, branch, onClose }: PrinterAssetDetailModalProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<PrinterMaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);

  useEffect(() => {
    if (!asset) return;
    loadLogs(asset.id);
  }, [asset]);

  async function loadLogs(printerAssetId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("printer_maintenance_logs")
      .select("*")
      .eq("printer_asset_id", printerAssetId)
      .order("performed_at", { ascending: false });
    setLogs((data as PrinterMaintenanceLog[]) ?? []);
    setLoading(false);
  }

  if (!asset) return null;

  const warranty = warrantyState(asset.warranty_expiry_date);
  const warrantyBadge = WARRANTY_BADGE[warranty];

  return (
    <>
      <Modal open={!!asset} onClose={onClose} title={asset.model}>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                PRINTER_ASSET_STATUS_STYLES[asset.status]
              )}
            >
              {PRINTER_ASSET_STATUS_LABELS[asset.status]}
            </span>
            {warrantyBadge && (
              <span className={cn("rounded-pill border px-2.5 py-1 text-[10px] font-semibold", warrantyBadge.className)}>
                {warrantyBadge.label}
              </span>
            )}
          </div>

          <div className="glass-card grid grid-cols-2 gap-3 p-4 text-sm">
            <Row label="Número de série" value={asset.serial_number ?? "—"} />
            <Row label="Filial" value={branch?.name ?? "Sem filial"} />
            <Row label="Data da compra" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString("pt-BR") : "—"} />
            <Row label="Valor pago" value={asset.purchase_price != null ? formatBRL(asset.purchase_price) : "—"} />
            <Row label="Fornecedor" value={asset.supplier ?? "—"} />
            <Row label="Garantia até" value={asset.warranty_expiry_date ? new Date(asset.warranty_expiry_date).toLocaleDateString("pt-BR") : "—"} />
            <Row label="Horas de uso" value={`${asset.estimated_usage_hours}h`} />
          </div>

          {asset.invoice_url && (
            <a
              href={asset.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-neon-pink hover:underline"
            >
              <ExternalLink size={12} /> Ver nota fiscal
            </a>
          )}

          {asset.notes && <p className="text-xs text-text-secondary">{asset.notes}</p>}

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Histórico de Manutenção</p>
              <NeonButton size="sm" variant="outline" onClick={() => setLogModalOpen(true)} className="whitespace-nowrap">
                <Plus size={12} /> Adicionar
              </NeonButton>
            </div>

            {loading ? (
              <div className="flex justify-center py-6 text-text-muted">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-text-muted">Nenhuma manutenção registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5">
                    <Wrench size={13} className="mt-0.5 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{log.description}</p>
                      <p className="text-xs text-text-muted">{new Date(log.performed_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {log.cost != null && (
                      <span className="font-numeric shrink-0 text-xs text-text-secondary">{formatBRL(log.cost)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <MaintenanceLogModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        printerAssetId={asset.id}
        onSaved={(log) => setLogs((prev) => [log, ...prev])}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="text-text-primary">{value}</p>
    </div>
  );
}
