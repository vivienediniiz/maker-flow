"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export function NewProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      .from("products")
      .insert({
        user_id: user.id,
        name,
        category: category || null,
        cost_price: Number(costPrice) || 0,
        sale_price: Number(salePrice) || 0,
        stock_quantity: Number(stockQuantity) || 0,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated(data as Product);
    setName("");
    setCategory("");
    setCostPrice("");
    setSalePrice("");
    setStockQuantity("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Produto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome do produto</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Vaso Geométrico Torcido"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Categoria</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Decoração"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Custo (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Venda (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Estoque</label>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="glass-input w-full"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar Produto"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}