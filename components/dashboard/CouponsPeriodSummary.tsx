"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBRL } from "@/lib/utils";
import { Loader2, Tag } from "lucide-react";
import type { Quote } from "@/lib/types";

type PeriodKey = "today" | "7d" | "30d" | "month";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Este mês" },
];

function periodStart(period: PeriodKey): Date {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

interface CouponUsage {
  couponId: string;
  code: string;
  count: number;
  total: number;
}

export function CouponsPeriodSummary() {
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

  const totalDescontos = periodQuotes.reduce((s, q) => s + (q.discount_amount ?? 0), 0);
  const cuponsUtilizados = periodQuotes.filter((q) => q.coupon_id).length;

  // Ranking por quantidade de usos no período (desempate por valor descontado).
  const topCoupons = useMemo(() => {
    const map = new Map<string, CouponUsage>();
    for (const q of periodQuotes) {
      if (!q.coupon_id) continue;
      const entry = map.get(q.coupon_id) ?? { couponId: q.coupon_id, code: q.coupon_code ?? "—", count: 0, total: 0 };
      entry.count += 1;
      entry.total += q.discount_amount ?? 0;
      map.set(q.coupon_id, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.total - a.total)
      .slice(0, 3);
  }, [periodQuotes]);

  return (
    <GlassCard padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Cupons e Descontos</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Total em Descontos</p>
              <p className="font-numeric mt-1 text-lg font-semibold text-red-400">{formatBRL(totalDescontos)}</p>
            </div>
            <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Cupons Utilizados</p>
              <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{cuponsUtilizados}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Cupons mais usados</p>
            {topCoupons.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum cupom usado nesse período.</p>
            ) : (
              <div className="space-y-2">
                {topCoupons.map((c) => (
                  <div
                    key={c.couponId}
                    className="flex items-center justify-between rounded-xl border border-border-glass bg-white/[0.02] px-4 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Tag size={13} className="shrink-0 text-neon-pink" />
                      <span className="truncate text-sm font-medium text-text-primary">{c.code}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        · {c.count} {c.count === 1 ? "uso" : "usos"}
                      </span>
                    </div>
                    <span className="font-numeric shrink-0 text-sm font-medium text-text-primary">{formatBRL(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
