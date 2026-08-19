"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { createClient } from "@/lib/supabase/client";
import type { FixedExpense } from "@/lib/types";

interface FixedExpenseModalProps {
  open: boolean;
  onClose: () => void;
  expense?: FixedExpense | null;
  onSaved: (expense: FixedExpense) => void;
}

export function FixedExpenseModal({ open, onClose, expense, onSaved }: FixedExpenseModalProps) {
  const supabase = createClient();
  const isEditing = !!expense;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(expense?.name ?? "");
    setCategory(expense?.category ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setDueDay(expense?.due_day != null ? String(expense.due_day) : "");
    setActive(expense?.active ?? true);
    setError(null);
  }, [open, expense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const day = dueDay.trim() === "" ? null : Number(dueDay);
    if (day != null && (isNaN(day) || day < 1 || day > 31)) {
      setError("Informe um dia de vencimento válido (1 a 31), ou deixe em branco.");
      return;
    }

    setSaving(true);

    const payload = {
      name,
      category: category || null,
      amount: Number(amount) || 0,
      due_day: day,
      active,
    };

    if (isEditing && expense) {
      const { data, error: updateError } = await supabase
        .from("fixed_expenses")
        .update(payload)
        .eq("id", expense.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as FixedExpense);
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
      .from("fixed_expenses")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as FixedExpense);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome da despesa</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Aluguel do ateliê"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Categoria</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Energia, Internet, Aluguel"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Valor mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-input w-full"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Dia de vencimento <span className="text-text-muted/60">— opcional, só referência</span>
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="glass-input w-full sm:w-32"
            placeholder="Ex: 5"
          />
        </div>

        <Toggle checked={active} onChange={setActive} label="Despesa ativa (entra no cálculo mensal)" />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar Despesa Fixa"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
