"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { KpiCard } from "@/components/ui/KpiCard";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import { AffiliateDetailModal } from "@/components/admin/AffiliateDetailModal";
import { TopAffiliatesChart } from "@/components/charts/TopAffiliatesChart";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { getCyclePricing } from "@/lib/plans";
import { AFFILIATE_COMMISSION_RATE } from "@/lib/affiliates";
import { Search, Download, Loader2, Wallet, Gift, Users, TrendingUp } from "lucide-react";
import type { AdminSubscriberRow, AffiliateCommission } from "@/lib/types";

interface AffiliateRow {
  subscriber: AdminSubscriberRow;
  referredCount: number;
  convertedCount: number;
  revenueGenerated: number;
  commissionPending: number;
  commissionPaid: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminAffiliatesPage() {
  const supabase = createClient();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<AdminSubscriberRow[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailAffiliate, setDetailAffiliate] = useState<AdminSubscriberRow | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: subscribersData }, { data: commissionsData }] = await Promise.all([
      supabase.from("admin_subscribers_view").select("*"),
      supabase.from("affiliate_commissions").select("*"),
    ]);
    setSubscribers((subscribersData as AdminSubscriberRow[]) ?? []);
    setCommissions((commissionsData as AffiliateCommission[]) ?? []);
    setLoading(false);
  }

  const affiliates = useMemo<AffiliateRow[]>(() => {
    const affiliateSubs = subscribers.filter((s) => s.affiliate_code);
    return affiliateSubs.map((subscriber) => {
      const referredCount = subscribers.filter((s) => s.referred_by === subscriber.user_id).length;
      const ownCommissions = commissions.filter((c) => c.affiliate_user_id === subscriber.user_id);
      const revenueGenerated = ownCommissions.reduce((sum, c) => sum + getCyclePricing(c.plan_id, "monthly").price, 0);
      const commissionPending = ownCommissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
      const commissionPaid = ownCommissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
      return {
        subscriber,
        referredCount,
        convertedCount: ownCommissions.length,
        revenueGenerated,
        commissionPending,
        commissionPaid,
      };
    });
  }, [subscribers, commissions]);

  const stats = useMemo(() => {
    const active = affiliates.filter((a) => a.subscriber.affiliate_active).length;
    const totalReferred = affiliates.reduce((sum, a) => sum + a.referredCount, 0);
    const totalConverted = affiliates.reduce((sum, a) => sum + a.convertedCount, 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const commissionThisMonth = commissions.filter((c) => new Date(c.created_at) >= startOfMonth).reduce((sum, c) => sum + c.amount, 0);
    const commissionTotal = commissions.reduce((sum, c) => sum + c.amount, 0);
    const avgTicket = affiliates.length > 0 ? commissionTotal / affiliates.length : 0;
    return { active, inactive: affiliates.length - active, totalReferred, totalConverted, commissionThisMonth, commissionTotal, avgTicket };
  }, [affiliates, commissions]);

  const topChartData = useMemo(
    () =>
      [...affiliates]
        .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
        .slice(0, 10)
        .filter((a) => a.revenueGenerated > 0)
        .reverse()
        .map((a) => ({ label: a.subscriber.full_name || a.subscriber.email, amount: a.revenueGenerated })),
    [affiliates]
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const filtered = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return affiliates
      .filter((a) => {
        if (statusFilter === "active" && !a.subscriber.affiliate_active) return false;
        if (statusFilter === "inactive" && a.subscriber.affiliate_active) return false;
        if (
          searchLower &&
          !a.subscriber.full_name?.toLowerCase().includes(searchLower) &&
          !a.subscriber.email?.toLowerCase().includes(searchLower) &&
          !a.subscriber.affiliate_code?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.revenueGenerated - a.revenueGenerated);
  }, [affiliates, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allPageSelected = paginated.length > 0 && paginated.every((a) => selectedIds.has(a.subscriber.user_id));

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
      if (allPageSelected) paginated.forEach((a) => next.delete(a.subscriber.user_id));
      else paginated.forEach((a) => next.add(a.subscriber.user_id));
      return next;
    });
  }

  async function handleBulkTogglePendingCommissions() {
    const targets = affiliates.filter((a) => selectedIds.has(a.subscriber.user_id) && a.commissionPending > 0);
    if (targets.length === 0) return;
    const totalPending = targets.reduce((sum, a) => sum + a.commissionPending, 0);
    if (
      !(await confirm(
        `Marcar comissão pendente de ${targets.length} afiliado${targets.length > 1 ? "s" : ""} (total ${formatBRL(totalPending)}) como paga? Confirme só depois de já ter feito a transferência de verdade pra cada um.`
      ))
    ) {
      return;
    }
    setPayingBulk(true);
    const pendingIds = commissions.filter((c) => targets.some((t) => t.subscriber.user_id === c.affiliate_user_id) && c.status === "pending").map((c) => c.id);
    await supabase.from("affiliate_commissions").update({ status: "paid" }).in("id", pendingIds);
    await loadAll();
    setSelectedIds(new Set());
    setPayingBulk(false);
  }

  async function handleBulkSetActive(active: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSubscribers((prev) => prev.map((s) => (ids.includes(s.user_id) ? { ...s, affiliate_active: active } : s)));
    await supabase.from("profiles").update({ affiliate_active: active }).in("id", ids);
  }

  function handleExportCsv() {
    const rows = filtered.filter((a) => selectedIds.size === 0 || selectedIds.has(a.subscriber.user_id));
    const csvRows = [
      ["Nome", "Email", "Código", "Status", "Comissão %", "Indicados", "Convertidos", "Receita Gerada", "Comissão Pendente", "Data Inscrição"],
      ...rows.map((a) => [
        a.subscriber.full_name ?? "",
        a.subscriber.email,
        a.subscriber.affiliate_code ?? "",
        a.subscriber.affiliate_active ? "Ativo" : "Inativo",
        String(((a.subscriber.affiliate_commission_rate ?? AFFILIATE_COMMISSION_RATE) * 100).toFixed(0)),
        String(a.referredCount),
        String(a.convertedCount),
        String(a.revenueGenerated),
        String(a.commissionPending),
        new Date(a.subscriber.created_at).toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = csvRows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afiliados-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <h1 className="font-display text-xl">Afiliados</h1>
        <p className="text-sm text-text-secondary">{affiliates.length} pessoas já geraram um link de indicação.</p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Afiliados Ativos" value={String(stats.active)} icon={Gift} accent="green" />
        <KpiCard label="Indicados (total)" value={String(stats.totalReferred)} icon={Users} accent="pink" />
        <KpiCard label="Convertidos (total)" value={String(stats.totalConverted)} icon={TrendingUp} accent="purple" />
        <KpiCard label="Ticket Médio / Afiliado" value={formatBRL(stats.avgTicket)} icon={Wallet} accent="orange" />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard padding="lg">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Comissão Gerada Este Mês</p>
          <p className="font-numeric mt-1 text-xl font-semibold text-text-primary">{formatBRL(stats.commissionThisMonth)}</p>
        </GlassCard>
        <GlassCard padding="lg">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Comissão Acumulada (Total)</p>
          <p className="font-numeric mt-1 text-xl font-semibold text-text-primary">{formatBRL(stats.commissionTotal)}</p>
        </GlassCard>
        <GlassCard padding="lg">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Afiliados Inativos</p>
          <p className="font-numeric mt-1 text-xl font-semibold text-text-primary">{stats.inactive}</p>
        </GlassCard>
      </div>

      <GlassCard padding="lg">
        <h3 className="mb-2 font-display text-base">Top 10 Afiliados por Receita Gerada</h3>
        <TopAffiliatesChart data={topChartData} />
      </GlassCard>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou código..."
            className="glass-input w-full pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="glass-input">
          <option value="all" className="bg-bg-raised">Todos os status</option>
          <option value="active" className="bg-bg-raised">Ativos</option>
          <option value="inactive" className="bg-bg-raised">Inativos</option>
        </select>
        <NeonButton type="button" variant="outline" size="sm" onClick={handleExportCsv}>
          <Download size={14} /> Exportar CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
        </NeonButton>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neon-pink/30 bg-neon-pink/[0.06] px-4 py-3">
          <p className="text-xs font-medium text-text-primary">{selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}</p>
          <div className="flex flex-wrap items-center gap-2">
            <NeonButton type="button" variant="outline" size="sm" onClick={handleBulkTogglePendingCommissions} disabled={payingBulk}>
              {payingBulk ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />} Pagar Pendentes
            </NeonButton>
            <NeonButton type="button" variant="outline" size="sm" onClick={() => handleBulkSetActive(true)}>
              Ativar
            </NeonButton>
            <NeonButton type="button" variant="outline" size="sm" onClick={() => handleBulkSetActive(false)}>
              Desativar
            </NeonButton>
          </div>
        </div>
      )}

      <GlassCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-glass">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                <th className="w-10 px-4 py-4">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} className="accent-[#FF4EDF]" aria-label="Selecionar página" />
                </th>
                <th className="px-4 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Nome / E-mail</th>
                <th className="px-6 py-4 font-medium">Código</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Comissão %</th>
                <th className="px-6 py-4 font-medium">Indicados</th>
                <th className="px-6 py-4 font-medium">Convertidos</th>
                <th className="px-6 py-4 font-medium">Receita Gerada</th>
                <th className="px-6 py-4 font-medium">Comissão Devida</th>
                <th className="w-24 px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-text-muted">
                    Nenhum afiliado encontrado.
                  </td>
                </tr>
              ) : (
                paginated.map((a, idx) => (
                  <tr
                    key={a.subscriber.user_id}
                    onClick={() => setDetailAffiliate(a.subscriber)}
                    className={cn(
                      "cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]",
                      selectedIds.has(a.subscriber.user_id) && "bg-neon-pink/[0.04]"
                    )}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.subscriber.user_id)}
                        onChange={() => toggleSelected(a.subscriber.user_id)}
                        className="accent-[#FF4EDF]"
                        aria-label={`Selecionar ${a.subscriber.full_name}`}
                      />
                    </td>
                    <td className="px-4 py-4 font-numeric text-text-muted">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="truncate font-medium text-text-primary">{a.subscriber.full_name || "—"}</p>
                      <p className="truncate text-xs text-text-muted">{a.subscriber.email}</p>
                    </td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{a.subscriber.affiliate_code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                          a.subscriber.affiliate_active ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-white/10 text-text-secondary border-white/10"
                        )}
                      >
                        {a.subscriber.affiliate_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {((a.subscriber.affiliate_commission_rate ?? AFFILIATE_COMMISSION_RATE) * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{a.referredCount}</td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{a.convertedCount}</td>
                    <td className="px-6 py-4 font-numeric text-text-primary">{formatBRL(a.revenueGenerated)}</td>
                    <td className="font-numeric px-6 py-4 text-amber-300">{formatBRL(a.commissionPending)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailAffiliate(a.subscriber);
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-pill border border-border-glass px-3 py-1 disabled:opacity-30">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-pill border border-border-glass px-3 py-1 disabled:opacity-30">
              Próxima
            </button>
          </div>
        </div>
      </GlassCard>

      <AffiliateDetailModal
        affiliate={detailAffiliate}
        onClose={() => {
          setDetailAffiliate(null);
          // Recarrega pra refletir comissão marcada como paga dentro do
          // modal (o modal só atualiza o próprio estado local).
          loadAll();
        }}
        onUpdated={(patch) => {
          if (!detailAffiliate) return;
          setSubscribers((prev) => prev.map((s) => (s.user_id === detailAffiliate.user_id ? { ...s, ...patch } : s)));
          setDetailAffiliate((prev) => (prev ? { ...prev, ...patch } : prev));
        }}
      />
    </div>
  );
}
