"use client";

import { cn } from "@/lib/utils";
import { Gift, Copy, MousePointerClick, Users2 } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const STATS = [
  { icon: MousePointerClick, label: "Cliques", value: "0" },
  { icon: Users2, label: "Convertidas", value: "0" },
  { icon: Gift, label: "Total Ganho", value: "R$ 0,00" },
];

const STOPS: CursorStop[] = [
  { top: "26%", left: "85%" },
  { top: "62%", left: "50%" },
];

export function AffiliationMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-3 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />

      <div className="flex items-center gap-2">
        <Gift size={14} className="text-neon-pink" />
        <p className="font-display text-sm text-text-primary">Sistema de Afiliação</p>
      </div>

      <p className="text-[9px] text-text-muted">
        Indique o StudioMaker e ganhe 30% da primeira cobrança de quem assinar pelo seu link.
      </p>

      <div
        className={cn(
          "glass-card flex items-center justify-between gap-2 p-2.5 transition-all duration-300",
          active === 0 && "ring-2 ring-neon-pink/60"
        )}
      >
        <span className="truncate text-[9px] text-text-secondary">
          studiomaker3d.com.br/signup?ref=studio-diniz
        </span>
        <Copy size={12} className="shrink-0 text-neon-pink" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card space-y-1 p-2 text-center">
            <s.icon size={12} className="mx-auto text-neon-pink" />
            <p className="font-numeric text-[11px] font-semibold text-text-primary">{s.value}</p>
            <p className="text-[8px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-pill bg-neon-gradient py-2 text-[10px] font-semibold text-white transition-transform duration-300",
          active === 1 && "scale-[1.03] shadow-neon-glow"
        )}
      >
        Comece a compartilhar seu link
      </div>
    </div>
  );
}
