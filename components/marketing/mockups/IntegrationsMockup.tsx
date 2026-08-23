"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const CHANNELS = [
  { name: "Mercado Livre", status: "Conectado" },
  { name: "Mercado Pago", status: "Conectado" },
  { name: "Shopee", status: "Conectar" },
  { name: "TikTok Shop", status: "Conectar" },
];

const STOPS: CursorStop[] = [
  { top: "16%", left: "82%" },
  { top: "38%", left: "82%" },
  { top: "60%", left: "82%" },
  { top: "82%", left: "82%" },
];

export function IntegrationsMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-2.5 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />
      <p className="font-display text-sm text-text-primary">Integrações</p>

      {CHANNELS.map((c, i) => (
        <div
          key={c.name}
          className={cn(
            "glass-card flex items-center justify-between p-3 transition-all duration-300",
            i === active && "ring-2 ring-neon-pink/60"
          )}
        >
          <span className="text-xs text-text-secondary">{c.name}</span>
          {c.status === "Conectado" ? (
            <span className="flex items-center gap-1 rounded-pill bg-[#00FF9D]/10 px-2.5 py-1 text-[10px] text-[#00FF9D]">
              <CheckCircle2 size={11} /> Conectado
            </span>
          ) : (
            <span className="rounded-pill border border-border-glassStrong px-2.5 py-1 text-[10px] text-text-muted">
              Conectar
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
