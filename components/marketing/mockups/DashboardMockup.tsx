"use client";

import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const PERIODS = ["Hoje", "7 dias", "Mês"];

const STATS = [
  { icon: DollarSign, label: "Vendas Hoje", value: "R$ 842,00" },
  { icon: TrendingUp, label: "Margem Média", value: "48%" },
  { icon: Users, label: "Clientes Ativos", value: "126" },
];

const TOP_PRODUCTS = [
  { name: "Vaso Geométrico Torcido", pct: 92 },
  { name: "Suporte de Celular", pct: 68 },
  { name: "Chaveiro Personalizado", pct: 41 },
];

const STOPS: CursorStop[] = [
  { top: "18%", left: "58%" }, // pill "7 dias"
  { top: "44%", left: "20%" }, // card de margem
  { top: "78%", left: "50%" }, // item da lista
];

export function DashboardMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-4 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />

      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-text-primary">Resumo de Vendas</p>
        <div className="flex gap-1 rounded-pill bg-white/5 p-0.5">
          {PERIODS.map((p, i) => (
            <span
              key={p}
              className={cn(
                "rounded-pill px-2.5 py-1 text-[10px] transition-colors",
                i === 1 && active === 0
                  ? "bg-neon-gradient text-white shadow-neon-glow"
                  : "text-text-muted"
              )}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "glass-card space-y-1.5 p-2.5 transition-all duration-300",
              i === 1 && active === 1 && "ring-2 ring-neon-pink/60"
            )}
          >
            <s.icon size={14} className="text-neon-pink" />
            <p className="font-numeric text-xs font-semibold text-text-primary sm:text-sm">{s.value}</p>
            <p className="truncate text-[9px] text-text-muted sm:text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card space-y-2 p-3">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Produtos mais vendidos</p>
        {TOP_PRODUCTS.map((p, i) => (
          <div
            key={p.name}
            className={cn(
              "space-y-1 rounded-lg p-1 transition-colors duration-300",
              i === 2 && active === 2 && "bg-white/[0.06]"
            )}
          >
            <div className="flex items-center justify-between text-[10px] text-text-secondary">
              <span className="truncate">{p.name}</span>
              <span className="font-numeric text-text-muted">{p.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-white/5">
              <div className="h-full rounded-pill bg-neon-gradient" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
