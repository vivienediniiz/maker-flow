"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";

export function QuickSaleModal({
  open,
  onClose,
  itemName,
  unitPrice,
  maxQuantity,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  itemName: string;
  unitPrice: number;
  maxQuantity: number;
  onConfirm?: (data: { quantity: number; channel: string }) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState("presencial");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm?.({ quantity, channel });
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

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>Cancelar</NeonButton>
          <NeonButton type="submit">Confirmar Venda</NeonButton>
        </div>
      </form>
    </Modal>
  );
}
