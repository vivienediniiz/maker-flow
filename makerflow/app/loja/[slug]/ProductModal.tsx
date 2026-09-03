"use client";

import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { StoreProductPublic } from "@/lib/types";

interface ProductModalProps {
  product: StoreProductPublic;
  primaryColor: string;
  titleFontFamily: string;
  subtitleFontFamily: string;
  defaultProductionMessage: string | null;
  onClose: () => void;
  onAddToCart: (customization: string | null) => void;
}

export function ProductModal({
  product,
  primaryColor,
  titleFontFamily,
  subtitleFontFamily,
  defaultProductionMessage,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [customization, setCustomization] = useState("");

  useEffect(() => {
    setCustomization("");
  }, [product.id]);

  const days = product.estimated_production_days;
  const productionText =
    days != null ? `Pronto em até ${days} dia${days === 1 ? " útil" : "s úteis"}` : defaultProductionMessage || "Consulte o prazo com a loja";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#141221] shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
        >
          <X size={16} />
        </button>

        <div className="aspect-square w-full shrink-0 bg-white/5">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">🧩</div>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {product.category && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{product.category}</p>
          )}
          <h2 style={{ fontFamily: titleFontFamily }} className="text-2xl text-white">
            {product.name}
          </h2>
          {product.description && (
            <p style={{ fontFamily: subtitleFontFamily }} className="text-sm text-white/70">
              {product.description}
            </p>
          )}

          <p className="text-2xl font-semibold" style={{ color: primaryColor }}>
            {formatBRL(product.sale_price)}
          </p>

          <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/85">
            <Clock size={15} className="shrink-0" />
            {productionText}
          </div>

          {product.allows_customization && (
            <div>
              <label className="mb-1.5 block text-xs text-white/60">
                {product.customization_label || "Personalização"}
              </label>
              <textarea
                value={customization}
                onChange={(e) => setCustomization(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                placeholder="Digite aqui..."
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onAddToCart(product.allows_customization ? customization.trim() || null : null)}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: primaryColor }}
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
