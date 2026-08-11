"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export function AddStockModal({
  open,
  onClose,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated: (product: Product) => void;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadProducts();
    setSelectedId("");
    setQuantity("");
    setError(null);
  }, [open]);

  async function loadProducts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts((data as Product[]) ?? []);
  }

  const selected = products.find((p) => p.id === selectedId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Selecione um produto.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    setSaving(true);

    const newStock = selected.stock_quantity + qty;
    const { data, error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", selected.id)
      .select()
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onUpdated(data as Product);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Estoque">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Produto</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="glass-input w-full"
          >
            <option value="" className="bg-bg-raised">
              {products.length === 0 ? "Nenhum produto cadastrado ainda" : "Selecione..."}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id} className="bg-bg-raised">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="glass-card space-y-1 px-4 py-3 text-sm">
            <p className="font-medium text-text-primary">{selected.name}</p>
            <p className="text-xs text-text-muted">{selected.category || "Sem categoria"}</p>
            <p className="text-xs text-text-secondary">Estoque atual: {selected.stock_quantity} un.</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Quantidade a adicionar</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
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
            {saving ? "Salvando..." : "Adicionar ao Estoque"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}