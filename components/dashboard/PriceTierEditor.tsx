"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PriceTier } from "@/lib/types";

export function PriceTierEditor({
  tiers,
  onChange,
}: {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
}) {
  function addTier() {
    onChange([...tiers, { quantity: tiers.length ? tiers[tiers.length - 1].quantity + 5 : 1, price: 0 }]);
  }

  function updateTier(index: number, patch: Partial<PriceTier>) {
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeTier(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="number"
              min={1}
              value={tier.quantity || ""}
              onChange={(e) => updateTier(i, { quantity: Number(e.target.value) })}
              className="glass-input w-full"
              placeholder="Qtd."
            />
          </div>
          <span className="text-xs text-text-muted">un. =</span>
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min={0}
              value={tier.price || ""}
              onChange={(e) => updateTier(i, { price: Number(e.target.value) })}
              className="glass-input w-full"
              placeholder="Preço unit."
            />
          </div>
          <button
            type="button"
            onClick={() => removeTier(i)}
            className="shrink-0 text-text-muted hover:text-red-400"
            aria-label="Remover faixa"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTier}
        className="flex items-center gap-1.5 text-xs text-neon-pink hover:underline"
      >
        <Plus size={13} /> Adicionar faixa de quantidade
      </button>
    </div>
  );
}