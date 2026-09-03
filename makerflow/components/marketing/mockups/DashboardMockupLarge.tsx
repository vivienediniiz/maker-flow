"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Bell,
  DollarSign,
  TrendingUp,
  Layers,
  Server,
  Disc3,
  AlertTriangle,
  Truck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ui/AppLogo";
import { SIDEBAR_ITEMS } from "./SidebarMockup";
import { FakeCursor, type CursorStop } from "./FakeCursor";

/**
 * Versão em largura cheia do dashboard, pra seção "Veja como funciona" da
 * landing — substitui o screenshot que estava ali. O DashboardMockup (sem
 * "Large") continua existindo pros ladrilhos pequenos: ele usa fontes de
 * 8-9px e `h-full`, que em largura cheia ficariam ilegíveis.
 *
 * A estrutura espelha o dashboard real de um plano pago
 * (app/dashboard/page.tsx): saudação, a linha de Resumo/Meta/Indicações, os
 * 4 KPIs, Atenção Prioritária e a Evolução Financeira. Os números são
 * fictícios — é peça de marketing, não janela pro banco.
 */

// Um valor por período — trocam junto com a aba, dando a impressão de um
// filtro sendo usado de verdade.
const PERIODS = [
  { label: "Hoje", sales: 2, gross: 486, profit: 231 },
  { label: "7 dias", sales: 11, gross: 3120, profit: 1498 },
  { label: "Este mês", sales: 38, gross: 12840, profit: 6165 },
] as const;

const KPIS = [
  { label: "Faturamento Mensal", value: 12840, prefix: "R$ ", delta: 18, icon: DollarSign, accent: "text-neon-pink" },
  { label: "Lucro Líquido", value: 6165, prefix: "R$ ", delta: 12, icon: TrendingUp, accent: "text-neon-green" },
  { label: "Filamento em Estoque", value: 14.6, suffix: " kg", decimals: 1, icon: Layers, accent: "text-neon-orange" },
  { label: "Status do Farm", value: 4, suffix: "/5 ativas", icon: Server, accent: "text-neon-purple" },
] as const;

const ALERTS = [
  { icon: Disc3, text: "PLA Preto abaixo de 150 g", tone: "text-neon-orange" },
  { icon: AlertTriangle, text: "2 vendas aguardando pagamento", tone: "text-text-secondary" },
  { icon: Truck, text: "1 envio sem código de rastreio", tone: "text-text-secondary" },
] as const;

/** Receita, custo e lucro dos últimos 6 meses (R$ mil) — só decorativo. */
const MONTHS = [
  { m: "Mar", receita: 6.2, custo: 3.4, lucro: 2.8 },
  { m: "Abr", receita: 7.8, custo: 4.1, lucro: 3.7 },
  { m: "Mai", receita: 7.1, custo: 3.9, lucro: 3.2 },
  { m: "Jun", receita: 9.4, custo: 4.8, lucro: 4.6 },
  { m: "Jul", receita: 10.9, custo: 5.3, lucro: 5.6 },
  { m: "Ago", receita: 12.8, custo: 6.7, lucro: 6.2 },
];

const CHART_MAX = 13;

const STOPS: CursorStop[] = [
  { top: "22%", left: "30%" },
  { top: "45%", left: "62%" },
  { top: "80%", left: "45%" },
];

/** Conta de 0 até `to` quando `active` vira true. Com movimento reduzido, entrega o valor final direto. */
function useCountUp(to: number, active: boolean, reduced: boolean, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(to);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // expo-out: mesma sensação das outras animações da landing
      setValue(to * (1 - Math.pow(2, -10 * t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, active, reduced, durationMs]);

  return value;
}

function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function CountUp({
  to,
  active,
  reduced,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  active: boolean;
  reduced: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const value = useCountUp(to, active, reduced);
  return (
    <>
      {prefix}
      {formatNumber(value, decimals)}
      {suffix}
    </>
  );
}

export function DashboardMockupLarge() {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  const [period, setPeriod] = useState(0);

  // As abas de período e o cursor falso andam juntos: o cursor "clica" e o
  // painel responde. Parado quando o usuário pede menos movimento.
  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => setPeriod((p) => (p + 1) % PERIODS.length), 3200);
    return () => clearInterval(id);
  }, [inView, reduced]);

  const active = PERIODS[period];

  return (
    <div ref={ref} className="relative flex min-h-[520px] text-left">
      {!reduced && <FakeCursor stops={STOPS} activeIndex={period} />}

      {/* Sidebar — mesmos itens do menu real */}
      <aside className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-border-glass bg-white/[0.02] p-3 lg:flex">
        <div className="mb-3 px-1">
          <AppLogo iconClassName="h-6 w-6" textClassName="font-display text-sm" />
        </div>
        {SIDEBAR_ITEMS.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
              i === 0 ? "bg-white/[0.06] text-text-primary" : "text-text-muted"
            )}
          >
            <item.icon size={13} className={i === 0 ? "text-neon-pink" : ""} />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-border-glass px-4 py-2.5">
          <span className="font-display text-sm text-text-primary">Dashboard</span>
          <div className="flex items-center gap-3">
            <Bell size={14} className="text-text-muted" />
            <div className="h-6 w-6 rounded-full bg-neon-gradient" />
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="font-display text-base text-text-primary">Olá, Studio Diniz 👋</p>
            <p className="text-[11px] text-text-muted">Aqui está o resumo do seu estúdio hoje.</p>
          </div>

          {/* Resumo de vendas + meta + indicações */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="glass-card space-y-2.5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wider text-text-muted">Resumo de Vendas</p>
              </div>
              <div className="flex gap-1">
                {PERIODS.map((p, i) => (
                  <span
                    key={p.label}
                    className={cn(
                      "rounded-pill px-2 py-0.5 text-[9px] transition-colors duration-300",
                      i === period ? "bg-neon-gradient text-white" : "bg-white/5 text-text-muted"
                    )}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
              {/* key força o count-up a rodar de novo a cada troca de período */}
              <div key={period} className="flex items-end justify-between">
                <div>
                  <p className="font-numeric text-lg font-semibold text-text-primary">
                    <CountUp to={active.gross} active={inView} reduced={reduced} prefix="R$ " />
                  </p>
                  <p className="text-[9px] text-text-muted">{active.sales} vendas · bruto</p>
                </div>
                <p className="font-numeric text-xs text-neon-green">
                  <CountUp to={active.profit} active={inView} reduced={reduced} prefix="+R$ " />
                </p>
              </div>
            </div>

            <div className="glass-card space-y-2 p-3">
              <p className="text-[9px] uppercase tracking-wider text-text-muted">Meta do Mês</p>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="#FF4EDF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="97"
                    initial={{ strokeDashoffset: 97 }}
                    animate={inView ? { strokeDashoffset: 97 - 97 * 0.72 } : {}}
                    transition={{ duration: reduced ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
                <div>
                  <p className="font-numeric text-lg font-semibold text-text-primary">
                    <CountUp to={72} active={inView} reduced={reduced} suffix="%" />
                  </p>
                  <p className="text-[9px] text-text-muted">R$ 12.840 de R$ 18.000</p>
                </div>
              </div>
            </div>

            <div className="glass-card space-y-2 p-3">
              <p className="text-[9px] uppercase tracking-wider text-text-muted">Indicações</p>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-numeric text-lg font-semibold text-text-primary">
                    <CountUp to={9} active={inView} reduced={reduced} />
                  </p>
                  <p className="text-[9px] text-text-muted">indicados</p>
                </div>
                <div>
                  <p className="font-numeric text-lg font-semibold text-neon-green">
                    <CountUp to={4} active={inView} reduced={reduced} />
                  </p>
                  <p className="text-[9px] text-text-muted">convertidos</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.1 + i * 0.08 }}
                className="glass-card space-y-2.5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9px] uppercase tracking-wider text-text-muted">{k.label}</span>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5", k.accent)}>
                    <k.icon size={11} />
                  </span>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-numeric text-sm font-semibold text-text-primary">
                    <CountUp
                      to={k.value}
                      active={inView}
                      reduced={reduced}
                      prefix={"prefix" in k ? k.prefix : ""}
                      suffix={"suffix" in k ? k.suffix : ""}
                      decimals={"decimals" in k ? k.decimals : 0}
                    />
                  </span>
                  {"delta" in k && (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-neon-green">
                      <TrendingUp size={9} />
                      {k.delta}%
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Atenção Prioritária */}
          <div>
            <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-text-muted">Atenção Prioritária</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ALERTS.map((a, i) => (
                <motion.div
                  key={a.text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.45 + i * 0.1 }}
                  className="glass-card flex items-center gap-2 p-2.5 text-[10px]"
                >
                  <a.icon size={12} className={a.tone} />
                  <span className="truncate text-text-secondary">{a.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Evolução Financeira */}
          <div>
            <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-text-muted">Evolução Financeira</p>
            <div className="glass-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-text-primary">Receita x Custo x Lucro</p>
                  <p className="text-[9px] text-text-muted">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-2.5">
                  {[
                    { label: "Receita", color: "bg-neon-pink" },
                    { label: "Custo", color: "bg-neon-orange" },
                    { label: "Lucro", color: "bg-neon-green" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-[8px] text-text-muted">
                      <span className={cn("h-1.5 w-1.5 rounded-full", l.color)} />
                      {l.label}
                    </span>
                  ))}
                  <ChevronDown size={12} className="text-text-muted" />
                </div>
              </div>

              <div className="flex h-28 items-end gap-2">
                {MONTHS.map((month, i) => (
                  <div key={month.m} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-24 w-full items-end justify-center gap-[3px]">
                      {(
                        [
                          { v: month.receita, color: "bg-neon-pink" },
                          { v: month.custo, color: "bg-neon-orange" },
                          { v: month.lucro, color: "bg-neon-green" },
                        ] as const
                      ).map((bar, j) => (
                        <motion.span
                          key={j}
                          className={cn("w-1.5 rounded-t-sm sm:w-2", bar.color)}
                          initial={{ height: 0 }}
                          animate={inView ? { height: `${(bar.v / CHART_MAX) * 100}%` } : {}}
                          transition={{
                            duration: reduced ? 0 : 0.7,
                            delay: reduced ? 0 : 0.55 + i * 0.07 + j * 0.03,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] text-text-muted">{month.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
