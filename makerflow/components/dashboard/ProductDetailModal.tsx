"use client";

import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { formatBRL, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductDetailModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  if (!product) return null;

  const profit = product.sale_price - product.cost_price;
  const margin = product.sale_price > 0 ? (profit / product.sale_price) * 100 : 0;

  return (
    <Modal open={!!product} onClose={onClose} title={product.name}>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl bg-neon-gradient-soft">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="h-full w-full object-cover" sizes="56rem" />
          ) : (
            <span className="text-5xl">🧩</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {product.category && (
            <span className="rounded-pill bg-white/5 px-3 py-1 text-xs text-text-secondary">{product.category}</span>
          )}
          <span className="rounded-pill bg-white/5 px-3 py-1 text-xs text-text-secondary">
            {product.stock_quantity} em estoque
          </span>
        </div>

        {product.description && <p className="text-sm text-text-secondary">{product.description}</p>}

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Custo" value={formatBRL(product.cost_price)} />
          <Stat label="Venda" value={formatBRL(product.sale_price)} />
          <Stat label="Lucro" value={formatBRL(profit)} accent="green" />
          <Stat label="Margem" value={`${margin.toFixed(0)}%`} accent="pink" />
        </div>

        {product.price_tiers.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Faixas de preço por quantidade
            </p>
            <div className="space-y-1.5">
              {product.price_tiers.map((t, i) => (
                <div key={i} className="glass-card flex justify-between px-3 py-2 text-sm">
                  <span className="text-text-secondary">{t.quantity} un.</span>
                  <span className="font-numeric text-text-primary">{formatBRL(t.price)} / un.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.calc_inputs && (
          <p className="text-[11px] text-neon-green">
            ✓ Este produto tem os parâmetros de cálculo salvos — selecione-o na Calculadora pra reutilizar.
          </p>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "pink" }) {
  return (
    <div className="glass-card px-3 py-2.5">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className={cn("font-numeric font-medium", accent === "green" && "text-neon-green", accent === "pink" && "text-neon-pink")}>
        {value}
      </p>
    </div>
  );
}