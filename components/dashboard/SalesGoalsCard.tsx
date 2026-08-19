"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { SalesGoalModal } from "@/components/dashboard/SalesGoalModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Target, Pencil, Loader2 } from "lucide-react";
import type { SalesGoal } from "@/lib/types";

function currentMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function SalesGoalsCard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<SalesGoal | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const month = currentMonthIso();

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const monthStart = new Date(month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    const [{ data: goalData }, { data: quotesData }] = await Promise.all([
      supabase.from("sales_goals").select("*").eq("user_id", user.id).eq("month", month).maybeSingle(),
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
  const revenuePct = revenueGoal && revenueGoal > 0 ? Math.min(100, (revenue / revenueGoal) * 100) : null;
  const salesCountPct = salesCountGoal && salesCountGoal > 0 ? Math.min(100, (salesCount / salesCountGoal) * 100) : null;
  const hasGoal = revenueGoal != null || salesCountGoal != null;

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Metas do Mês</h3>
        <NeonButton variant="outline" size="sm" onClick={() => setModalOpen(true)} className="whitespace-nowrap">
          {goal ? <Pencil size={13} /> : <Target size={13} />} {goal ? "Editar Meta" : "Definir Meta"}
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !hasGoal ? (
        <p className="text-sm text-text-muted">Nenhuma meta definida pra este mês ainda.</p>
      ) : (
        <div className="space-y-4">
          {revenueGoal != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Faturamento</span>
                <span className="font-numeric text-text-primary">
                  {formatBRL(revenue)} de {formatBRL(revenueGoal)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-white/5">
                <div className="h-full rounded-pill bg-neon-gradient" style={{ width: `${revenuePct}%` }} />
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
