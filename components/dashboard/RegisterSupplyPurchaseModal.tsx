"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { Supply, SupplyMovement } from "@/lib/types";

interface RegisterSupplyPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  supplies: Supply[];
  preselectedSupplyId?: string | null;
  onPurchased: (supply: Supply, movement: SupplyMovement) => void;
}

export function RegisterSupplyPurchaseModal({
  open,
  onClose,
  supplies,
  preselectedSupplyId,
  onPurchased,
}: RegisterSupplyPurchaseModalProps) {
  const supabase = createClient();
  const [supplyId, setSupplyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = supplies.find((s) => s.id === supplyId) ?? null;

  useEffect(() => {
    if (!open) return;
    setSupplyId(preselectedSupplyId ?? "");
    setQuantity("");
    setTotalPaid("");
    setNote("");
    setError(null);
  }, [open, preselectedSupplyId]);

  const qty = Number(quantity);
  const total = Number(totalPaid);
  const newCostPerUnit = qty > 0 && total > 0 ? total / qty : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Selecione o insumo que está sendo abastecido.");
      return;
    }
    if (!qty || qty <= 0) {
      setError("Informe uma quantidade comprada válida.");
      return;
    }
    if (!total || total <= 0) {
      setError("Informe o valor total pago.");
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

    const costPerUnit = total / qty;

    const { data: updatedSupply, error: updateError } = await supabase
      .from("supplies")
      .update({
        stock_quantity: selected.stock_quantity + qty,
        cost_per_unit: costPerUnit,
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
      .from("supply_movements")
      .insert({
        supply_id: selected.id,
        user_id: user.id,
        movement_type: "purchase",
        quantity: qty,
        unit_cost_at_time: costPerUnit,
        note: note.trim() || null,
      })
      .select()
      .single();

    setSaving(false);

    if (movementError) {
      setError(movementError.message);
      return;
    }

    onPurchased(updatedSupply as Supply, movement as SupplyMovement);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Compra">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Insumo</label>
          <select
            required
            value={supplyId}
            onChange={(e) => setSupplyId(e.target.value)}
            className="glass-input w-full"
          >
            <option value="" className="bg-bg-raised">
              {supplies.length === 0 ? "Nenhum insumo cadastrado" : "Selecione..."}
            </option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id} className="bg-bg-raised">
                {s.name} ({s.stock_quantity} {s.unit})
              </option>
            ))}
          </select>
          {supplies.length === 0 && (
            <p className="mt-1.5 text-[11px] text-text-muted">
              Cadastre um insumo com &quot;Novo Insumo&quot; antes de registrar uma compra.
            </p>
          )}
        </div>

        {selected && (
          <div className="glass-card px-4 py-3">
            <p className="text-xs text-text-secondary">
              Estoque atual: <span className="font-medium text-text-primary">{selected.stock_quantity} {selected.unit}</span>{" "}
              · {formatBRL(selected.cost_per_unit)}/{selected.unit}
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Quantidade comprada {selected && `(${selected.unit})`}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="glass-input w-full"
            placeholder="100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Valor total pago (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={totalPaid}
            onChange={(e) => setTotalPaid(e.target.value)}
            className="glass-input w-full"
            placeholder="45,00"
          />
        </div>

        {newCostPerUnit != null && (
          <p className="text-[11px] text-text-muted">
            Novo custo por unidade: <span className="font-medium text-text-primary">{formatBRL(newCostPerUnit)}</span> — vai
            sobrescrever o custo atual do insumo.
          </p>
        )}

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
