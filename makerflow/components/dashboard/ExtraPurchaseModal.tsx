"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import type { ExtraPurchase } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface ExtraPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  purchase?: ExtraPurchase | null;
  onSaved: (purchase: ExtraPurchase) => void;
}

export function ExtraPurchaseModal({ open, onClose, purchase, onSaved }: ExtraPurchaseModalProps) {
  const supabase = createClient();
  const isEditing = !!purchase;

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription(purchase?.description ?? "");
    setCategory(purchase?.category ?? "");
    setAmount(purchase ? String(purchase.amount) : "");
    setSupplier(purchase?.supplier ?? "");
    setPurchasedAt(purchase?.purchased_at ?? todayIso());
    setNotes(purchase?.notes ?? "");
    setError(null);
  }, [open, purchase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      description,
      category: category || null,
      amount: Number(amount) || 0,
      supplier: supplier || null,
      purchased_at: purchasedAt,
      notes: notes || null,
    };

    if (isEditing && purchase) {
      const { data, error: updateError } = await supabase
        .from("extra_purchases")
        .update(payload)
        .eq("id", purchase.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as ExtraPurchase);
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
      .from("extra_purchases")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as ExtraPurchase);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Compra Extra" : "Nova Compra Extra"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Descrição</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Manutenção da impressora, bico novo"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Categoria</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Manutenção"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Valor (R$)</label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Fornecedor</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Loja 3D Center"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Data da compra</label>
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              className="glass-input w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="glass-input w-full resize-none"
            placeholder="Detalhes adicionais, se precisar."
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Registrar Compra"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
