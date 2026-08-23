"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBRL } from "@/lib/utils";
import { QUOTE_SOURCE_LABELS, QUOTE_SOURCE_BADGE_STYLES, QUOTE_SOURCE_ICONS } from "@/lib/quotes";
import { Loader2 } from "lucide-react";
import type { Quote, QuoteSource } from "@/lib/types";

type PeriodKey = "today" | "7d" | "month";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "month", label: "Este mês" },
];

// Mercado Pago escondido aqui (segue o mesmo tratamento da tela de Integrações),
// mas os totais acima (Total Vendido/Custos/Lucro Real) continuam somando tudo.
const SOURCES: QuoteSource[] = ["mercado_livre", "shopee", "tiktok_shop", "manual", "loja_online"];

function periodStart(period: PeriodKey): Date {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function SalesPeriodSummary() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("month");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["paid", "in_production", "shipped"]);
      setQuotes((data as Quote[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const start = useMemo(() => periodStart(period), [period]);
  const periodQuotes = useMemo(() => quotes.filter((q) => new Date(q.sent_at) >= start), [quotes, start]);

  const totalBruto = periodQuotes.reduce((s, q) => s + q.final_price, 0);
  const totalCustos = periodQuotes.reduce((s, q) => s + q.platform_fee + q.cost_amount, 0);
  const lucroReal = totalBruto - totalCustos;

  const bySource = SOURCES.map((source) => ({
    source,
    total: periodQuotes.filter((q) => q.source === source).reduce((s, q) => s + q.final_price, 0),
  }));

  return (
    <GlassCard padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Resumo de Vendas</h3>
        <div className="glass-card flex flex-wrap gap-1 p-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "flex min-h-[44px] items-center justify-center rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors sm:min-h-0",
                period === p.key ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Total Vendido</p>
              <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{formatBRL(totalBruto)}</p>
            </div>
            <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Custos + Taxas</p>
              <p className="font-numeric mt-1 text-lg font-semibold text-red-400">{formatBRL(totalCustos)}</p>
            </div>
            <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Lucro Real</p>
              <p className="font-numeric mt-1 text-lg font-semibold text-neon-green">{formatBRL(lucroReal)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {bySource.map(({ source, total }) => {
              const Icon = QUOTE_SOURCE_ICONS[source];
              return (
                <span
                  key={source}
                  className={cn(
                    "flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium",
                    QUOTE_SOURCE_BADGE_STYLES[source]
                  )}
                >
                  <Icon size={12} />
                  {QUOTE_SOURCE_LABELS[source]} · {formatBRL(total)}
                </span>
              );
            })}
          </div>

          {periodQuotes.length === 0 && (
            <p className="text-sm text-text-muted">Nenhuma venda nesse período ainda.</p>
          )}
        </>
      )}
    </GlassCard>
  );
}
