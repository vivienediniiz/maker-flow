"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { CategorySelect } from "@/components/dashboard/CategorySelect";
import { PriceTierEditor } from "@/components/dashboard/PriceTierEditor";
import { createClient } from "@/lib/supabase/client";
import type { Product, PriceTier } from "@/lib/types";

interface NewProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
  initialName?: string;
  initialDescription?: string;
  initialCostPrice?: number;
  initialSalePrice?: number;
}

export function NewProductModal({
  open,
  onClose,
  onCreated,
  initialName = "",
  initialDescription = "",
  initialCostPrice,
  initialSalePrice,
}: NewProductModalProps) {
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState(initialDescription);
  const [costPrice, setCostPrice] = useState(initialCostPrice != null ? String(initialCostPrice.toFixed(2)) : "");
  const [salePrice, setSalePrice] = useState(initialSalePrice != null ? String(initialSalePrice.toFixed(2)) : "");
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setCostPrice(initialCostPrice != null ? String(initialCostPrice.toFixed(2)) : "");
      setSalePrice(initialSalePrice != null ? String(initialSalePrice.toFixed(2)) : "");
      setCategory("");
      setPriceTiers([]);
      setError(null);
    }
  }, [open, initialName, initialDescription, initialCostPrice, initialSalePrice]);

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
        description: description || null,
        cost_price: Number(costPrice) || 0,
        sale_price: Number(salePrice) || 0,
        stock_quantity: 0,
        price_tiers: priceTiers.filter((t) => t.quantity > 0 && t.price > 0),
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated(data as Product);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar Produto">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto scrollbar-glass pr-1">
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
          <CategorySelect value={category} onChange={setCategory} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="glass-input w-full resize-none"
            placeholder="Detalhes do produto, material, acabamento..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Faixas de preço por quantidade <span className="text-text-muted/60">(opcional)</span>
          </label>
          <PriceTierEditor tiers={priceTiers} onChange={setPriceTiers} />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Produto"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}