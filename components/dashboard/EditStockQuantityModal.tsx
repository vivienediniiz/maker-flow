"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

export function EditStockQuantityModal({
  product,
  onClose,
  onUpdated,
}: {
  product: Product | null;
  onClose: () => void;
  onUpdated: (product: Product) => void;
}) {
  const supabase = createClient();
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(String(product.stock_quantity));
      setError(null);
    }
  }, [product]);

  if (!product) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (quantity.trim() === "" || isNaN(qty) || qty < 0) {
      setError("Informe uma quantidade válida (0 ou mais).");
      return;
    }

    setSaving(true);
    const { data, error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: qty })
      .eq("id", product!.id)
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
    <Modal open={!!product} onClose={onClose} title="Editar Estoque">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card space-y-1 px-4 py-3 text-sm">
          <p className="font-medium text-text-primary">{product.name}</p>
          <p className="text-xs text-text-muted">{product.category || "Sem categoria"}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Quantidade em estoque</label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="glass-input w-full"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-text-muted">
            Define o número exato — diferente de &quot;Adicionar Estoque&quot;, que soma ao que já existe.
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
