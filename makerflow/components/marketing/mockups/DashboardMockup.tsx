"use client";

import { cn } from "@/lib/utils";
import { Bell, DollarSign, TrendingUp, Wallet, AlertTriangle, Disc3 } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { SIDEBAR_ITEMS } from "./SidebarMockup";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const STATS = [
  { icon: DollarSign, label: "Total Vendas", value: "R$ 5.240,00" },
  { icon: TrendingUp, label: "Margem", value: "48%" },
  { icon: Wallet, label: "Lucro", value: "R$ 2.515,20" },
];

const TOP_PRODUCTS = [
  { name: "Vaso Geométrico Torcido", pct: 92 },
  { name: "Suporte de Celular", pct: 68 },
  { name: "Chaveiro Personalizado", pct: 41 },
];

/** Pontos normalizados (0-100) de um mês de faturamento — só decorativo. */
const REVENUE_POINTS = [18, 34, 28, 52, 46, 70, 64, 88];

const STOPS: CursorStop[] = [
  { top: "20%", left: "38%" },
  { top: "38%", left: "72%" },
  { top: "78%", left: "48%" },
];

function buildLinePath(points: number[], w: number, h: number) {
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / 100) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function DashboardMockup() {
  const active = useCycle(STOPS.length);
  const linePath = buildLinePath(REVENUE_POINTS, 100, 36);

  return (
    <div className="relative flex h-full">
      <FakeCursor stops={STOPS} activeIndex={active} />

      {/* Sidebar mini — só os primeiros itens, pra caber sem virar o SidebarMockup inteiro */}
      <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-border-glass bg-white/[0.02] py-3 sm:flex">
        <div className="h-5 w-5 rounded-md bg-neon-gradient" />
        {SIDEBAR_ITEMS.slice(0, 7).map((item, i) => (
          <item.icon key={item.label} size={13} className={i === 0 ? "text-neon-pink" : "text-text-muted"} />
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AppLogo iconClassName="h-5 w-5" textClassName="font-display text-xs" />
          <div className="flex items-center gap-2">
            <Bell size={13} className="text-text-muted" />
            <div className="h-5 w-5 rounded-full bg-neon-gradient" />
          </div>
        </div>

        {/* Resumo de Vendas */}
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-muted">Resumo de Vendas</p>
          <div className="grid grid-cols-3 gap-2">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "glass-card space-y-1 p-2 transition-all duration-300",
                  i === 0 && active === 0 && "ring-2 ring-neon-pink/60"
                )}
              >
                <s.icon size={12} className="text-neon-pink" />
                <p className="font-numeric text-[11px] font-semibold text-text-primary sm:text-xs">{s.value}</p>
                <p className="truncate text-[8px] text-text-muted sm:text-[9px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Metas do Mês */}
          <div className="glass-card space-y-1.5 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-text-muted">Meta do Mês</p>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#FF4EDF"
                  strokeWidth="4"
                  strokeDasharray={`${0 * 0.97} 97`}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p className="font-numeric text-xs font-semibold text-text-primary">0%</p>
                <p className="text-[8px] text-text-muted">Sem vendas ainda</p>
              </div>
            </div>
          </div>

          {/* Indicações */}
          <div
            className={cn(
              "glass-card space-y-1.5 p-2.5 transition-all duration-300",
              active === 1 && "ring-2 ring-neon-pink/60"
            )}
          >
            <p className="text-[9px] uppercase tracking-wider text-text-muted">Indicações</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-numeric text-xs font-semibold text-text-primary">0</p>
                <p className="text-[8px] text-text-muted">interações</p>
              </div>
              <div>
                <p className="font-numeric text-xs font-semibold text-text-primary">0</p>
                <p className="text-[8px] text-text-muted">convertidas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="glass-card space-y-1.5 p-2.5">
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Produtos Mais Vendidos</p>
          {TOP_PRODUCTS.map((p) => (
            <div key={p.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px] text-text-secondary">
                <span className="truncate">{p.name}</span>
                <span className="font-numeric text-text-muted">{p.pct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-pill bg-white/5">
                <div className="h-full rounded-pill bg-neon-gradient" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Faturamento Mensal */}
          <div className="glass-card space-y-1 p-2.5">
            <p className="text-[9px] uppercase tracking-wider text-text-muted">Faturamento Mensal</p>
            <svg viewBox="0 0 100 36" className="h-9 w-full" preserveAspectRatio="none">
              <path d={linePath} fill="none" stroke="url(#revenue-gradient)" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="revenue-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E86333" />
                  <stop offset="50%" stopColor="#FF4EDF" />
                  <stop offset="100%" stopColor="#AA17DB" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Atenção Prioritária */}
          <div
            className={cn(
              "glass-card space-y-1 p-2.5 transition-all duration-300",
              active === 2 && "ring-2 ring-neon-pink/60"
            )}
          >
            <p className="text-[9px] uppercase tracking-wider text-text-muted">Atenção Prioritária</p>
            <div className="flex items-center gap-1 text-[9px] text-amber-400">
              <Disc3 size={10} /> Filamento acabando
            </div>
            <div className="flex items-center gap-1 text-[9px] text-text-secondary">
              <AlertTriangle size={10} /> 1 pedido atrasando
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
