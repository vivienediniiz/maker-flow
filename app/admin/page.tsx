"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { KpiCard } from "@/components/ui/KpiCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { getPlan } from "@/lib/plans";
import { RevenueSubscribersChart, type RevenueSubscribersPoint } from "@/components/charts/RevenueSubscribersChart";
import { ChurnRateChart, type ChurnPoint } from "@/components/charts/ChurnRateChart";
import { DollarSign, Users, Gift, TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";
import type { AdminSubscriberRow, SubscriptionEvent, AffiliateCommission } from "@/lib/types";

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<AdminSubscriberRow[]>([]);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [{ data: subscribersData }, { data: eventsData }, { data: commissionsData }] = await Promise.all([
      supabase.from("admin_subscribers_view").select("*"),
      supabase
        .from("subscription_events")
        .select("*")
        .gte("created_at", twelveMonthsAgo.toISOString())
        .order("created_at", { ascending: true }),
      supabase.from("affiliate_commissions").select("*"),
    ]);

    setSubscribers((subscribersData as AdminSubscriberRow[]) ?? []);
    setEvents((eventsData as SubscriptionEvent[]) ?? []);
    setCommissions((commissionsData as AffiliateCommission[]) ?? []);
    setLoading(false);
  }

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);

  const activeSubs = useMemo(() => subscribers.filter((s) => s.subscription_status === "active"), [subscribers]);
  const trialSubs = useMemo(
    () => subscribers.filter((s) => s.subscription_status === "inactive" && new Date(s.trial_ends_at) > now),
    [subscribers, now]
  );
  const cancelledSubs = useMemo(() => subscribers.filter((s) => s.subscription_status === "cancelled"), [subscribers]);

  const monthlyCount = useMemo(() => activeSubs.filter((s) => s.subscription_tier === "monthly").length, [activeSubs]);
  const quarterlyCount = useMemo(() => activeSubs.filter((s) => s.subscription_tier === "quarterly").length, [activeSubs]);

  const mrr = useMemo(
    () =>
      activeSubs.reduce((sum, s) => {
        if (s.subscription_tier === "monthly") return sum + getPlan("monthly").price;
        if (s.subscription_tier === "quarterly") return sum + getPlan("quarterly").price / 3;
        return sum;
      }, 0),
    [activeSubs]
  );

  const eventsThisMonth = useMemo(() => events.filter((e) => new Date(e.created_at) >= startOfMonth), [events, startOfMonth]);
  const newActiveThisMonth = useMemo(
    () => eventsThisMonth.filter((e) => e.to_status === "active" && e.from_status !== "active").length,
    [eventsThisMonth]
  );
  const cancellationsThisMonth = useMemo(
    () =>
      eventsThisMonth.filter((e) => e.from_status === "active" && (e.to_status === "cancelled" || e.to_status === "inactive"))
        .length,
    [eventsThisMonth]
  );

  // Estimativa (não é uma foto histórica real — reconstruída a partir do total
  // ativo agora + o que mudou este mês): sem tabela de snapshot diário, é o
  // jeito mais honesto de aproximar "quantos estavam ativos no início do mês".
  const estimatedActiveAtMonthStart = Math.max(0, activeSubs.length + cancellationsThisMonth - newActiveThisMonth);
  const churnRatePercent =
    estimatedActiveAtMonthStart > 0 ? (cancellationsThisMonth / estimatedActiveAtMonthStart) * 100 : 0;

  const affiliatesWithCode = useMemo(() => subscribers.filter((s) => s.affiliate_code).length, [subscribers]);
  const commissionThisMonth = useMemo(
    () => commissions.filter((c) => new Date(c.created_at) >= startOfMonth).reduce((sum, c) => sum + c.amount, 0),
    [commissions, startOfMonth]
  );
  const commissionTotal = useMemo(() => commissions.reduce((sum, c) => sum + c.amount, 0), [commissions]);

  const hasHistory = events.length > 0;

  const revenueChartData = useMemo<RevenueSubscribersPoint[]>(() => {
    const months: { key: string; label: string; date: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), date: d });
    }
    // Sem snapshot histórico, meses anteriores ao início do tracking (hoje)
    // ficam em zero — só o mês atual reflete o total real, ao vivo.
    return months.map((m, idx) => {
      const isCurrentMonth = idx === months.length - 1;
      return {
        label: m.label,
        mrr: isCurrentMonth ? mrr : 0,
        subscribers: isCurrentMonth ? activeSubs.length : 0,
      };
    });
  }, [now, mrr, activeSubs.length]);

  const churnChartData = useMemo<ChurnPoint[]>(() => {
    const days: { key: string; label: string; date: Date }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: dayLabel(d), date: d });
    }
    const cancelByDay = new Map<string, number>();
    for (const e of events) {
      if (e.from_status === "active" && (e.to_status === "cancelled" || e.to_status === "inactive")) {
        const key = e.created_at.slice(0, 10);
        cancelByDay.set(key, (cancelByDay.get(key) ?? 0) + 1);
      }
    }
    return days.map((d) => ({ label: d.label, cancellations: cancelByDay.get(d.key) ?? 0 }));
  }, [now, events]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl">Overview</h1>
        <p className="text-sm text-text-secondary">Métricas do negócio StudioMaker3D — assinantes, receita e afiliados.</p>
      </div>

      {!hasHistory && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          O histórico de troca de plano/status (`subscription_events`) começou a ser gravado agora — crescimento e
          churn mês a mês vão aparecer conforme os dados forem se acumulando. Os totais de assinantes/MRR abaixo já
          refletem o estado real de hoje.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="MRR" value={formatBRL(mrr)} icon={DollarSign} accent="pink" />
        <KpiCard label="Assinantes Ativos" value={String(activeSubs.length)} icon={Users} accent="green" />
        <KpiCard label="Novos este mês" value={String(newActiveThisMonth)} icon={TrendingUp} accent="purple" />
        <KpiCard
          label="Taxa de Churn (estimada)"
          value={`${churnRatePercent.toFixed(1)}%`}
          icon={TrendingDown}
          accent="orange"
        />
        <KpiCard label="Cancelamentos este mês" value={String(cancellationsThisMonth)} icon={Activity} accent="orange" />
        <KpiCard
          label="Afiliados com link ativo"
          value={String(affiliatesWithCode)}
          icon={Gift}
          accent="purple"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border-glass bg-white/[0.02] p-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Plano Mensal</p>
          <p className="font-numeric text-lg font-semibold text-text-primary">
            {monthlyCount} <span className="text-xs font-normal text-text-muted">· {formatBRL(getPlan("monthly").price)}/mês</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Plano Trimestral</p>
          <p className="font-numeric text-lg font-semibold text-text-primary">
            {quarterlyCount} <span className="text-xs font-normal text-text-muted">· {formatBRL(getPlan("quarterly").price)}/3 meses</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Em trial / Cancelados</p>
          <p className="font-numeric text-lg font-semibold text-text-primary">
            {trialSubs.length} <span className="text-xs font-normal text-text-muted">trial</span> ·{" "}
            {cancelledSubs.length} <span className="text-xs font-normal text-text-muted">cancelados</span>
          </p>
        </div>
      </div>

      <GlassAccordion title="Receita x Assinantes" subtitle="MRR e total de assinantes ativos, últimos 12 meses" defaultOpen>
        <RevenueSubscribersChart data={revenueChartData} />
      </GlassAccordion>

      <GlassAccordion title="Churn Diário" subtitle="Cancelamentos por dia, últimos 30 dias" defaultOpen>
        <ChurnRateChart data={churnChartData} />
      </GlassAccordion>

      <GlassCard padding="lg" className="space-y-3">
        <h3 className="font-display text-lg">Afiliados</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Afiliados com link gerado</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{affiliatesWithCode}</p>
          </div>
          <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Comissão gerada este mês</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{formatBRL(commissionThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Comissão acumulada (total)</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{formatBRL(commissionTotal)}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
