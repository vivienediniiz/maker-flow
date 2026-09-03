"use client";

import { cn } from "@/lib/utils";
import { Weight, Timer, Ruler } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const STOPS: CursorStop[] = [
  { top: "16%", left: "78%" }, // peso da mesa
  { top: "48%", left: "50%" }, // dropdown filamento
  { top: "88%", left: "50%" }, // botão criar pedido
];

export function CalculatorMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-3 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />

      <p className="font-display text-sm text-text-primary">Vaso Geométrico Torcido</p>

      <div>
        <p className="mb-1 text-[9px] uppercase tracking-wider text-text-muted">Mesa 1</p>
        <div
          className={cn(
            "glass-card grid grid-cols-3 gap-2 p-3 transition-all duration-300",
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
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-[9px] text-text-muted">
              <Ruler size={10} /> Dist. (mm)
            </p>
            <p className="font-numeric text-sm text-text-primary">200</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "glass-card flex items-center justify-between p-2.5 transition-all duration-300",
          active === 1 && "ring-2 ring-neon-pink/60"
        )}
      >
        <span className="text-[10px] text-text-muted">Filamento</span>
        <span className="rounded-pill bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary">
          PLA — Estoque barato (50%)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass-card space-y-0.5 p-2">
          <p className="text-[8px] text-text-muted">Energia (R$/kWh)</p>
          <p className="font-numeric text-[11px] text-text-primary">0,95</p>
        </div>
        <div className="glass-card space-y-0.5 p-2">
          <p className="text-[8px] text-text-muted">Mão de obra (h)</p>
          <p className="font-numeric text-[11px] text-text-primary">0,5</p>
        </div>
        <div className="glass-card space-y-0.5 p-2">
          <p className="text-[8px] text-text-muted">Consumíveis</p>
          <p className="font-numeric text-[11px] text-text-primary">R$ 25,00</p>
        </div>
      </div>

      <div className="glass-card space-y-1.5 p-3 text-center">
        <p className="text-[9px] text-text-muted">Custo por Unidade: R$ 24,74</p>
        <p className="text-[9px] text-text-muted">Preço de Venda Sugerido</p>
        <p className="neon-text font-numeric text-lg font-semibold">R$ 47,60</p>
      </div>

      <div className="flex gap-2">
        <div
          className={cn(
            "flex flex-1 items-center justify-center rounded-pill bg-neon-gradient py-2 text-[10px] font-semibold text-white transition-transform duration-300",
            active === 2 && "scale-[1.03] shadow-neon-glow"
          )}
        >
          Criar Pedido
        </div>
        <div className="flex flex-1 items-center justify-center rounded-pill border border-border-glassStrong py-2 text-[10px] text-text-secondary">
          Gerar PDF
        </div>
      </div>
    </div>
  );
}
