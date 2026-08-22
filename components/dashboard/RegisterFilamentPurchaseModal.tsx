"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { Filament, FilamentMovement } from "@/lib/types";

interface RegisterFilamentPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  filaments: Filament[];
  preselectedFilamentId?: string | null;
  onPurchased: (filament: Filament, movement: FilamentMovement) => void;
}

export function RegisterFilamentPurchaseModal({
  open,
  onClose,
  filaments,
  preselectedFilamentId,
  onPurchased,
}: RegisterFilamentPurchaseModalProps) {
  const supabase = createClient();
  const [filamentId, setFilamentId] = useState("");
  const [quantityG, setQuantityG] = useState("");
  const [newPricePerKg, setNewPricePerKg] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = filaments.find((f) => f.id === filamentId) ?? null;

  useEffect(() => {
    if (!open) return;
    const initialId = preselectedFilamentId ?? "";
    setFilamentId(initialId);
    setQuantityG("");
    setNote("");
    setError(null);
    const initial = filaments.find((f) => f.id === initialId);
    setNewPricePerKg(initial ? String(initial.price_per_kg) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedFilamentId]);

  function handleSelectFilament(id: string) {
    setFilamentId(id);
    const f = filaments.find((x) => x.id === id);
    setNewPricePerKg(f ? String(f.price_per_kg) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Selecione o filamento que está sendo abastecido.");
      return;
    }
    const qty = Number(quantityG);
    if (!qty || qty <= 0) {
      setError("Informe uma quantidade comprada válida (em gramas).");
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

    const updatedPrice = newPricePerKg !== "" ? Number(newPricePerKg) : selected.price_per_kg;

    const { data: updatedFilament, error: updateError } = await supabase
      .from("filaments")
      .update({
        remaining_weight_g: selected.remaining_weight_g + qty,
        weight_total_g: selected.weight_total_g + qty,
        price_per_kg: updatedPrice,
      })
      .eq("id", selected.id)
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
        filament_id: selected.id,
        user_id: user.id,
        movement_type: "purchase",
        quantity_g: qty,
        note: note.trim() || null,
      })
      .select()
      .single();

    setSaving(false);

    if (movementError) {
      setError(movementError.message);
      return;
    }

    onPurchased(updatedFilament as Filament, movement as FilamentMovement);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Compra">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Filamento</label>
          <select
            required
            value={filamentId}
            onChange={(e) => handleSelectFilament(e.target.value)}
            className="glass-input w-full"
          >
            <option value="" className="bg-bg-raised">
              {filaments.length === 0 ? "Nenhum filamento cadastrado" : "Selecione..."}
            </option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id} className="bg-bg-raised">
                {f.material} — {f.brand} ({f.remaining_weight_g}g / {f.weight_total_g}g)
              </option>
            ))}
          </select>
          {filaments.length === 0 && (
            <p className="mt-1.5 text-[11px] text-text-muted">
              Cadastre um filamento com &quot;Novo Filamento&quot; antes de registrar uma compra.
            </p>
          )}
        </div>

        {selected && (
          <div className="glass-card flex items-center gap-3 px-4 py-3">
            <span
              className="h-6 w-6 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: selected.color_hex }}
            />
            <p className="text-xs text-text-secondary">
              Estoque atual: <span className="font-medium text-text-primary">{selected.remaining_weight_g}g</span> de{" "}
              {selected.weight_total_g}g · {formatBRL(selected.price_per_kg)}/kg
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Quantidade comprada (g)</label>
          <input
            type="number"
            step="1"
            min="1"
            required
            value={quantityG}
            onChange={(e) => setQuantityG(e.target.value)}
            className="glass-input w-full"
            placeholder="1000"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Novo preço por kg (R$) <span className="text-text-muted/60">— opcional, atualiza o cadastro</span>
          </label>
          <CurrencyInput value={newPricePerKg} onChange={setNewPricePerKg} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Observação (opcional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: comprado na loja X"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Registrando..." : "Registrar Compra"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
