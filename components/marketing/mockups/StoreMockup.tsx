"use client";

import { cn } from "@/lib/utils";
import { Copy, ShoppingCart } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const PRODUCTS = [
  { name: "Vaso Geométrico", price: "R$ 47,60" },
  { name: "Suporte de Celular", price: "R$ 22,90" },
  { name: "Chaveiro Personalizado", price: "R$ 14,00" },
];

const STOPS: CursorStop[] = [
  { top: "20%", left: "85%" }, // botão copiar
  { top: "70%", left: "50%" }, // adicionar ao carrinho
];

export function StoreMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-3 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />

      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-text-primary">Minha Loja</p>
        <span className="flex items-center gap-1 rounded-pill bg-[#00FF9D]/10 px-2.5 py-1 text-[9px] text-[#00FF9D]">
          Ativada
        </span>
      </div>

      <div
        className={cn(
          "glass-card flex items-center justify-between gap-2 p-2.5 transition-all duration-300",
          active === 0 && "ring-2 ring-neon-pink/60"
        )}
      >
        <span className="truncate text-[10px] text-text-secondary">maker-flow.netlify.app/loja/studio-diniz</span>
        <Copy size={12} className="shrink-0 text-neon-pink" />
      </div>

      <p className="text-[9px] italic leading-relaxed text-text-muted">
        &ldquo;Peças personalizadas em impressão 3D, feitas sob medida pra você.&rdquo;
      </p>

      <div className="grid grid-cols-3 gap-2">
        {PRODUCTS.map((p, i) => (
          <div
            key={p.name}
            className={cn(
              "glass-card space-y-1.5 p-2 transition-all duration-300",
              i === 1 && active === 1 && "ring-2 ring-neon-pink/60"
            )}
          >
            <div className="aspect-square rounded-lg bg-neon-gradient-soft" />
            <p className="truncate text-[8px] text-text-secondary">{p.name}</p>
            <p className="font-numeric text-[9px] font-semibold text-text-primary">{p.price}</p>
            <div className="flex items-center justify-center gap-1 rounded-pill bg-neon-gradient py-1 text-[8px] text-white">
              <ShoppingCart size={9} /> Adicionar
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
