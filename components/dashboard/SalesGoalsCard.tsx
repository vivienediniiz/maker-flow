"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { SalesGoalModal } from "@/components/dashboard/SalesGoalModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Target, Pencil, Loader2 } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import type { SalesGoal } from "@/lib/types";

function monthIso(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Últimos 12 meses (incluindo o atual) pra dropdown de histórico. */
function monthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => monthIso(new Date(now.getFullYear(), now.getMonth() - i, 1)));
}

export function SalesGoalsCard() {
  const supabase = createClient();
  const options = useMemo(monthOptions, []);
  const currentMonth = useMemo(() => monthIso(new Date()), []);

  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<SalesGoal | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadAll(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function loadAll(targetMonth: string) {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [y, m] = targetMonth.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 1);

    const [{ data: goalData }, { data: quotesData }] = await Promise.all([
      supabase.from("sales_goals").select("*").eq("user_id", user.id).eq("month", targetMonth).maybeSingle(),
      supabase
        .from("quotes")
        .select("final_price")
        .eq("user_id", user.id)
        .in("status", ["paid", "in_production", "shipped"])
        .gte("sent_at", monthStart.toISOString())
        .lt("sent_at", monthEnd.toISOString()),
    ]);

    setGoal((goalData as SalesGoal) ?? null);
    const rows = quotesData ?? [];
    setRevenue(rows.reduce((s, r) => s + r.final_price, 0));
    setSalesCount(rows.length);
    setLoading(false);
  }

  const revenueGoal = goal?.revenue_goal ?? null;
  const salesCountGoal = goal?.sales_count_goal ?? null;
  const salesCountPct = salesCountGoal && salesCountGoal > 0 ? Math.min(100, (salesCount / salesCountGoal) * 100) : null;

  const rawPct = revenueGoal && revenueGoal > 0 ? (revenue / revenueGoal) * 100 : null;
  const exceeded = rawPct != null && rawPct > 100;
  const pieData =
    rawPct == null
      ? []
      : exceeded
      ? [{ name: "done", value: 1 }]
      : [
          { name: "done", value: revenue },
          { name: "remaining", value: Math.max((revenueGoal ?? 0) - revenue, 0) },
        ];

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Metas do Mês</h3>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="glass-input h-9 !w-auto py-0 text-xs">
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {monthLabel(opt)}
              </option>
            ))}
          </select>
          <NeonButton variant="outline" size="sm" onClick={() => setModalOpen(true)} className="whitespace-nowrap">
            {goal ? <Pencil size={13} /> : <Target size={13} />} {goal ? "Editar Meta" : "Definir Meta"}
          </NeonButton>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {revenueGoal == null ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-text-muted">
                {month === currentMonth
                  ? "Nenhuma meta definida pra este mês ainda."
                  : `Nenhuma meta definida pra ${monthLabel(month)}.`}
              </p>
              <NeonButton size="sm" onClick={() => setModalOpen(true)}>
                <Target size={13} /> Definir Meta do Mês
              </NeonButton>
            </div>
          ) : (
            <div className="relative mx-auto h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="goalProgress" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#E86333" />
                      <stop offset="50%" stopColor="#FF4EDF" />
                      <stop offset="100%" stopColor="#AA17DB" />
                    </linearGradient>
                    <linearGradient id="goalComplete" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#00FF9D" />
                      <stop offset="100%" stopColor="#FFD24D" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={68}
                    outerRadius={90}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "remaining" ? "rgba(255,255,255,0.08)" : exceeded ? "url(#goalComplete)" : "url(#goalProgress)"
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
                <span className={`font-numeric text-2xl font-semibold ${exceeded ? "text-neon-green" : "text-text-primary"}`}>
                  {Math.round(rawPct ?? 0)}%
                </span>
                <span className="font-numeric text-[11px] leading-tight text-text-secondary">
                  {formatBRL(revenue)}
                  <br />
                  de {formatBRL(revenueGoal)}
                </span>
              </div>
            </div>
          )}

          {salesCountGoal != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Vendas</span>
                <span className="font-numeric text-text-primary">
                  {salesCount} de {salesCountGoal}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-white/5">
                <div className="h-full rounded-pill bg-neon-gradient" style={{ width: `${salesCountPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      <SalesGoalModal open={modalOpen} onClose={() => setModalOpen(false)} month={month} goal={goal} onSaved={setGoal} />
    </GlassCard>
  );
}
