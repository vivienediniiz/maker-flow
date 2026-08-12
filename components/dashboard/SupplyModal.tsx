"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Supply, SupplyUnit } from "@/lib/types";

const UNITS: { value: SupplyUnit; label: string }[] = [
  { value: "un", label: "unidade" },
  { value: "g", label: "grama" },
  { value: "ml", label: "mililitro" },
  { value: "kg", label: "quilo" },
  { value: "l", label: "litro" },
];

interface SupplyModalProps {
  open: boolean;
  onClose: () => void;
  supply?: Supply | null;
  onSaved: (supply: Supply) => void;
}

export function SupplyModal({ open, onClose, supply, onSaved }: SupplyModalProps) {
  const supabase = createClient();
  const isEditing = !!supply;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState<SupplyUnit>("un");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supply?.name ?? "");
    setCategory(supply?.category ?? "");
    setUnit(supply?.unit ?? "un");
    setCostPerUnit(supply ? String(supply.cost_per_unit) : "");
    setStockQuantity(supply ? String(supply.stock_quantity) : "");
    setLowStockThreshold(supply?.low_stock_threshold != null ? String(supply.low_stock_threshold) : "");
    setError(null);
  }, [open, supply]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      category: category || null,
      unit,
      cost_per_unit: Number(costPerUnit) || 0,
      stock_quantity: Number(stockQuantity) || 0,
      low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : null,
    };

    if (isEditing && supply) {
      const { data, error: updateError } = await supabase
        .from("supplies")
        .update(payload)
        .eq("id", supply.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as Supply);
      onClose();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("supplies")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as Supply);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Insumo" : "Novo Insumo"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Cola quente, Fita crepe, Resina de acabamento"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Categoria</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Acabamento"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Unidade de medida</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as SupplyUnit)}
              className="glass-input w-full"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value} className="bg-bg-raised">
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Custo por unidade (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="glass-input w-full"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Quantidade em estoque</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="glass-input w-full"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Limite de estoque baixo (opcional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: 10"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Insumo"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
