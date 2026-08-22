"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import type { PrinterMaintenanceLog } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface MaintenanceLogModalProps {
  open: boolean;
  onClose: () => void;
  printerAssetId: string;
  onSaved: (log: PrinterMaintenanceLog) => void;
}

export function MaintenanceLogModal({ open, onClose, printerAssetId, onSaved }: MaintenanceLogModalProps) {
  const supabase = createClient();

  const [description, setDescription] = useState("");
  const [performedAt, setPerformedAt] = useState(todayIso());
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setPerformedAt(todayIso());
    setCost("");
    setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("printer_maintenance_logs")
      .insert({
        printer_asset_id: printerAssetId,
        user_id: user.id,
        description,
        performed_at: performedAt,
        cost: cost ? Number(cost) : null,
      })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as PrinterMaintenanceLog);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Manutenção">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Descrição</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Troca de bico, Calibração de mesa"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Data</label>
            <input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Custo (R$, opcional)</label>
            <CurrencyInput value={cost} onChange={setCost} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Registrar Manutenção"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
