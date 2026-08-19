"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { SalesGoal } from "@/lib/types";

interface SalesGoalModalProps {
  open: boolean;
  onClose: () => void;
  /** ISO date do primeiro dia do mês sendo definido (ex: "2026-08-01"). */
  month: string;
  goal: SalesGoal | null;
  onSaved: (goal: SalesGoal) => void;
}

export function SalesGoalModal({ open, onClose, month, goal, onSaved }: SalesGoalModalProps) {
  const supabase = createClient();
  const [revenueGoal, setRevenueGoal] = useState("");
  const [salesCountGoal, setSalesCountGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRevenueGoal(goal?.revenue_goal != null ? String(goal.revenue_goal) : "");
    setSalesCountGoal(goal?.sales_count_goal != null ? String(goal.sales_count_goal) : "");
    setError(null);
  }, [open, goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const revenue = revenueGoal.trim() === "" ? null : Number(revenueGoal);
    const count = salesCountGoal.trim() === "" ? null : Number(salesCountGoal);
    if (revenue == null && count == null) {
      setError("Defina pelo menos uma meta (faturamento ou quantidade de vendas).");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: upsertError } = await supabase
      .from("sales_goals")
      .upsert(
        {
          user_id: user.id,
          month,
          revenue_goal: revenue,
          sales_count_goal: count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" }
      )
      .select()
      .single();

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    onSaved(data as SalesGoal);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Meta de Vendas do Mês">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Meta de faturamento (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={revenueGoal}
            onChange={(e) => setRevenueGoal(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: 5000"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Meta de quantidade de vendas</label>
          <input
            type="number"
            min="0"
            value={salesCountGoal}
            onChange={(e) => setSalesCountGoal(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: 40"
          />
        </div>
        <p className="text-[11px] text-text-muted">Deixe um dos dois em branco se quiser acompanhar só o outro.</p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Meta"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
