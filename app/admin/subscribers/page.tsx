"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { KpiCard } from "@/components/ui/KpiCard";
import { SubscriberDetailModal } from "@/components/admin/SubscriberDetailModal";
import { PlanDistributionChart } from "@/components/charts/PlanDistributionChart";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { getCyclePricing, planDisplayLabel, type PlanTier, type BillingCycle } from "@/lib/plans";
import { Search, Download, Loader2, ArrowUpDown, UserCheck, UserX, UserMinus, Users } from "lucide-react";
import type { AdminSubscriberRow, SubscriptionTier, SubscriptionStatus } from "@/lib/types";

type SortKey = "full_name" | "subscription_tier" | "subscription_status" | "created_at" | "paid_until";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
  inactive: "Inativo",
};

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active: "bg-neon-green/15 text-neon-green border-neon-green/30",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  inactive: "bg-white/10 text-text-secondary border-white/10",
};

const PLAN_STYLES: Record<SubscriptionTier, string> = {
  free: "bg-white/10 text-text-secondary border-white/10",
  starter: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  pro: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Normaliza pro valor mensal-equivalente, considerando o ciclo real do assinante (mensal ou anual/12). */
function monthlyPrice(tier: SubscriptionTier, cycle: BillingCycle | null): number {
  if (tier === "free") return 0;
  const pricing = getCyclePricing(tier as PlanTier, cycle ?? "monthly");
  return pricing.price / pricing.frequencyMonths;
}

export default function AdminSubscribersPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<AdminSubscriberRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubscriptionStatus>("all");
  const [planFilter, setPlanFilter] = useState<"all" | SubscriptionTier>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailSubscriber, setDetailSubscriber] = useState<AdminSubscriberRow | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const { data } = await supabase.from("admin_subscribers_view").select("*");
    setSubscribers((data as AdminSubscriberRow[]) ?? []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const active = subscribers.filter((s) => s.subscription_status === "active").length;
    const paused = subscribers.filter((s) => s.subscription_status === "paused").length;
    const cancelled = subscribers.filter((s) => s.subscription_status === "cancelled").length;
    const starter = subscribers.filter((s) => s.subscription_status === "active" && s.subscription_tier === "starter").length;
    const pro = subscribers.filter((s) => s.subscription_status === "active" && s.subscription_tier === "pro").length;
    return { active, paused, cancelled, starter, pro };
  }, [subscribers]);

  const pieData = useMemo(
    () => [
      { name: "Starter", value: stats.starter, color: "#FF4EDF" },
      { name: "Pro", value: stats.pro, color: "#AA17DB" },
    ],
    [stats]
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter, pageSize]);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    let rows = subscribers.filter((s) => {
      if (statusFilter !== "all" && s.subscription_status !== statusFilter) return false;
      if (planFilter !== "all" && s.subscription_tier !== planFilter) return false;
      if (searchLower && !s.full_name?.toLowerCase().includes(searchLower) && !s.email?.toLowerCase().includes(searchLower)) {
        return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "full_name") cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
      else if (sortKey === "subscription_tier") cmp = monthlyPrice(a.subscription_tier, a.billing_cycle) - monthlyPrice(b.subscription_tier, b.billing_cycle);
      else if (sortKey === "subscription_status") cmp = a.subscription_status.localeCompare(b.subscription_status);
      else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === "paid_until") cmp = new Date(a.paid_until ?? 0).getTime() - new Date(b.paid_until ?? 0).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [subscribers, search, statusFilter, planFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allPageSelected = paginated.length > 0 && paginated.every((s) => selectedIds.has(s.user_id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach((s) => next.delete(s.user_id));
      else paginated.forEach((s) => next.add(s.user_id));
      return next;
    });
  }

  function handleExportCsv() {
    const rows = filtered.filter((s) => selectedIds.size === 0 || selectedIds.has(s.user_id));
    const csvRows = [
      ["Nome", "Email", "Telefone", "Plano", "Status", "Valor", "Cadastrado em", "Próximo ciclo"],
      ...rows.map((s) => [
        s.full_name ?? "",
        s.email,
        s.phone ?? "",
        planDisplayLabel(s.subscription_tier),
        STATUS_LABELS[s.subscription_status],
        String(monthlyPrice(s.subscription_tier, s.billing_cycle)),
        new Date(s.created_at).toLocaleDateString("pt-BR"),
        s.paid_until ? new Date(s.paid_until).toLocaleDateString("pt-BR") : "",
      ]),
    ];
    const csv = csvRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assinantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <h1 className="font-display text-xl">Assinantes</h1>
        <p className="text-sm text-text-secondary">{subscribers.length} contas cadastradas no total.</p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ativos" value={String(stats.active)} icon={UserCheck} accent="green" />
        <KpiCard label="Pausados" value={String(stats.paused)} icon={UserMinus} accent="orange" />
        <KpiCard label="Cancelados" value={String(stats.cancelled)} icon={UserX} accent="orange" />
        <KpiCard label="Total de contas" value={String(subscribers.length)} icon={Users} accent="purple" />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <GlassCard padding="lg" className="space-y-3">
          <h3 className="font-display text-base">Distribuição por Plano</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border-glass bg-white/[0.02] px-4 py-2.5">
              <span className="text-text-secondary">Starter · a partir de {formatBRL(getCyclePricing("starter", "monthly").price)}/mês</span>
              <span className="font-numeric font-semibold text-text-primary">{stats.starter}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border-glass bg-white/[0.02] px-4 py-2.5">
              <span className="text-text-secondary">Pro · a partir de {formatBRL(getCyclePricing("pro", "monthly").price)}/mês</span>
              <span className="font-numeric font-semibold text-text-primary">{stats.pro}</span>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="lg">
          <h3 className="mb-2 font-display text-base">Proporção Visual</h3>
          <PlanDistributionChart data={pieData} />
        </GlassCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="glass-input w-full pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="glass-input">
          <option value="all" className="bg-bg-raised">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((s) => (
            <option key={s} value={s} className="bg-bg-raised">{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)} className="glass-input">
          <option value="all" className="bg-bg-raised">Todos os planos</option>
          <option value="free" className="bg-bg-raised">Grátis</option>
          <option value="starter" className="bg-bg-raised">Starter</option>
          <option value="pro" className="bg-bg-raised">Pro</option>
        </select>
        <NeonButton type="button" variant="outline" size="sm" onClick={handleExportCsv}>
          <Download size={14} /> Exportar CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
        </NeonButton>
      </div>

      <GlassCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-glass">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                <th className="w-10 px-4 py-4">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} className="accent-[#FF4EDF]" aria-label="Selecionar página" />
                </th>
                <SortableHeader label="Nome / E-mail" sortKey="full_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHeader label="Plano" sortKey="subscription_tier" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHeader label="Status" sortKey="subscription_status" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="px-6 py-4 font-medium">Valor</th>
                <SortableHeader label="Cadastrado em" sortKey="created_at" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortableHeader label="Próximo Ciclo" sortKey="paid_until" current={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="w-24 px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-text-muted">
                    Nenhum assinante encontrado.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr
                    key={s.user_id}
                    onClick={() => setDetailSubscriber(s)}
                    className={cn(
                      "cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]",
                      selectedIds.has(s.user_id) && "bg-neon-pink/[0.04]"
                    )}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.user_id)}
                        onChange={() => toggleSelected(s.user_id)}
                        className="accent-[#FF4EDF]"
                        aria-label={`Selecionar ${s.full_name}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className="truncate font-medium text-text-primary">{s.full_name || "—"}</p>
                      <p className="truncate text-xs text-text-muted">{s.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("rounded-pill border px-2.5 py-1 text-[11px] font-medium", PLAN_STYLES[s.subscription_tier])}>
                        {planDisplayLabel(s.subscription_tier)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("rounded-pill border px-2.5 py-1 text-[11px] font-medium", STATUS_STYLES[s.subscription_status])}>
                        {STATUS_LABELS[s.subscription_status]}
                      </span>
                    </td>
                    <td className="font-numeric px-6 py-4 text-text-secondary">
                      {s.subscription_tier === "free" ? "—" : formatBRL(monthlyPrice(s.subscription_tier, s.billing_cycle))}
                    </td>
                    <td className="px-6 py-4 text-xs text-text-muted">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-6 py-4 text-xs text-text-muted">
                      {s.paid_until ? new Date(s.paid_until).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailSubscriber(s);
                        }}
                        className="text-xs font-medium text-neon-pink hover:underline"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-glass px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Por página:</span>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                className={cn(
                  "rounded-pill px-2.5 py-1 transition-colors",
                  pageSize === size ? "bg-neon-gradient text-white" : "hover:bg-white/5 hover:text-text-primary"
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>
              Página {page} de {totalPages} · {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-pill border border-border-glass px-3 py-1 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-pill border border-border-glass px-3 py-1 disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      </GlassCard>

      <SubscriberDetailModal subscriber={detailSubscriber} onClose={() => setDetailSubscriber(null)} />
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onClick: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className="px-6 py-4 font-medium">
      <button onClick={() => onClick(sortKey)} className={cn("flex items-center gap-1.5", active ? "text-text-primary" : "text-text-muted hover:text-text-secondary")}>
        {label}
        <ArrowUpDown size={11} className={active ? (dir === "asc" ? "rotate-180" : "") : "opacity-40"} />
      </button>
    </th>
  );
}
