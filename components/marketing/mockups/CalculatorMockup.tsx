"use client";

import { cn } from "@/lib/utils";
import { Weight, Timer } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const STOPS: CursorStop[] = [
  { top: "22%", left: "78%" }, // peso da mesa
  { top: "55%", left: "50%" }, // slider de margem
  { top: "85%", left: "50%" }, // botão cadastrar
];

export function CalculatorMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-3 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />

      <p className="font-display text-sm text-text-primary">Mesa 1</p>
      <div
        className={cn(
          "glass-card grid grid-cols-2 gap-2 p-3 transition-all duration-300",
          active === 0 && "ring-2 ring-neon-pink/60"
        )}
      >
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[9px] text-text-muted">
            <Weight size={10} /> Peso (g)
          </p>
          <p className="font-numeric text-sm text-text-primary">128</p>
        </div>
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[9px] text-text-muted">
            <Timer size={10} /> Tempo (h)
          </p>
          <p className="font-numeric text-sm text-text-primary">3,5</p>
        </div>
      </div>

      <div className={cn("glass-card space-y-2 p-3 transition-all duration-300", active === 1 && "ring-2 ring-neon-pink/60")}>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-muted">Margem de Lucro Alvo</span>
          <span className="font-numeric text-neon-green">50%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-pill bg-white/5">
          <div className="h-full w-1/2 rounded-pill bg-[#00FF9D]" />
        </div>
      </div>

      <div className="glass-card space-y-1.5 p-3 text-center">
        <p className="text-[9px] text-text-muted">Preço de Venda Sugerido</p>
        <p className="neon-text font-numeric text-lg font-semibold">R$ 47,60</p>
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-pill bg-neon-gradient py-2 text-[11px] font-semibold text-white transition-transform duration-300",
          active === 2 && "scale-[1.03] shadow-neon-glow"
        )}
      >
        Cadastrar Produto
      </div>
    </div>
  );
}
