"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";

export function QuickSaleModal({
  open,
  onClose,
  productId,
  itemName,
  unitPrice,
  maxQuantity,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  itemName: string;
  unitPrice: number;
  maxQuantity: number;
  onConfirm?: (data: { quantity: number; channel: string; stockAdjustedAutomatically: boolean }) => void;
}) {
  const supabase = createClient();
  const { paid } = useSubscription();
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState("presencial");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (quantity <= 0 || quantity > maxQuantity) {
      setError("Quantidade inválida.");
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

    const total = unitPrice * quantity;

    // Registra a venda no histórico...
    const { error: saleError } = await supabase.from("sales").insert({
      user_id: user.id,
      product_id: productId,
      product_name: itemName,
      quantity,
      unit_price: unitPrice,
      total,
      channel,
    });

    if (saleError) {
      setSaving(false);
      setError(saleError.message);
      return;
    }

    // Baixa automática de estoque é recurso pago — no plano Grátis, a venda
    // fica registrada no histórico, mas o estoque precisa ser ajustado à mão.
    if (paid) {
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock_quantity: maxQuantity - quantity })
        .eq("id", productId);

      if (stockError) {
        setSaving(false);
        setError(stockError.message);
        return;
      }
    }

    setSaving(false);
    onConfirm?.({ quantity, channel, stockAdjustedAutomatically: paid });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Baixa Rápida — Venda">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{itemName}</p>
          <p className="text-xs text-text-muted">{maxQuantity} unidades disponíveis</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Quantidade</label>
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Canal da venda</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="glass-input w-full">
              <option value="presencial" className="bg-bg-raised">Presencial</option>
              <option value="whatsapp" className="bg-bg-raised">WhatsApp</option>
              <option value="marketplace" className="bg-bg-raised">Marketplace</option>
              <option value="site" className="bg-bg-raised">Site</option>
            </select>
          </div>
        </div>

        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs text-text-muted">Total da venda</span>
          <span className="neon-text font-numeric text-xl font-semibold">{formatBRL(unitPrice * quantity)}</span>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>Cancelar</NeonButton>
          <NeonButton type="submit" disabled={saving}>{saving ? "Salvando..." : "Confirmar Venda"}</NeonButton>
        </div>
      </form>
    </Modal>
  );
}