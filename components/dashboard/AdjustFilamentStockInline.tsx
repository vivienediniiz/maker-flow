"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { filamentLabel } from "@/lib/filaments";
import type { Filament, FilamentMovement } from "@/lib/types";

interface AdjustFilamentStockInlineProps {
  filament: Filament;
  onAdjusted: (filament: Filament, movement: FilamentMovement) => void;
}

export function AdjustFilamentStockInline({ filament, onAdjusted }: AdjustFilamentStockInlineProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(filament.remaining_weight_g));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setValue(String(filament.remaining_weight_g));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const newValue = Number(value);
    if (!Number.isFinite(newValue) || newValue < 0) {
      setError("Informe um peso válido (em gramas).");
      return;
    }

    const diff = newValue - filament.remaining_weight_g;
    if (diff === 0) {
      setOpen(false);
      return;
    }

    const sign = diff > 0 ? "+" : "";
    const confirmed = confirm(
      `Isso vai ${diff > 0 ? "adicionar" : "remover"} ${sign}${diff}g ${diff > 0 ? "ao" : "do"} estoque de ${filamentLabel(filament)}. Confirmar?`
    );
    if (!confirmed) return;

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

    const { data: updatedFilament, error: updateError } = await supabase
      .from("filaments")
      .update({ remaining_weight_g: newValue })
      .eq("id", filament.id)
      .select()
      .single();

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    const { data: movement, error: movementError } = await supabase
      .from("filament_movements")
      .insert({
        filament_id: filament.id,
        user_id: user.id,
        movement_type: "manual_adjustment",
        quantity_g: diff,
        note: "Ajuste manual de estoque",
      })
      .select()
      .single();

    setSaving(false);

    if (movementError) {
      setError(movementError.message);
      return;
    }

    onAdjusted(updatedFilament as Filament, movement as FilamentMovement);
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={handleOpen} className="flex items-center gap-1 text-[11px] text-text-muted hover:text-neon-pink">
        <Pencil size={11} /> Ajustar estoque
      </button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border-glass bg-white/[0.03] p-2">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="1"
          min="0"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="glass-input w-full py-1.5 text-xs"
        />
        <span className="text-[11px] text-text-muted">g</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 text-neon-green hover:opacity-80 disabled:opacity-40"
          aria-label="Confirmar ajuste"
        >
          <Check size={14} />
        </button>
        <button onClick={() => setOpen(false)} className="shrink-0 text-text-muted hover:text-red-400" aria-label="Cancelar ajuste">
          <X size={14} />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
