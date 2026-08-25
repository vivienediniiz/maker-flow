"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { KpiCard } from "@/components/ui/KpiCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { ExtraPurchaseModal } from "@/components/dashboard/ExtraPurchaseModal";
import { FixedExpenseModal } from "@/components/dashboard/FixedExpenseModal";
import { CouponsPeriodSummary } from "@/components/dashboard/CouponsPeriodSummary";
import { CouponsCampaignsSection } from "@/components/dashboard/CouponsCampaignsSection";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { FinancialEvolutionChart, type FinancialEvolutionPoint } from "@/components/charts/FinancialEvolutionChart";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { QUOTE_SOURCE_LABELS } from "@/lib/quotes";
import { DollarSign, TrendingDown, TrendingUp, XCircle, Download, FileText, Loader2, Plus, Pencil, Trash2, Repeat } from "lucide-react";
import type { Quote, ExtraPurchase, FixedExpense, QuoteSource } from "@/lib/types";

type PeriodKey = "today" | "7d" | "month";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "month", label: "Este mês" },
];

const SOURCE_OPTIONS: { key: "all" | QuoteSource; label: string }[] = [
  { key: "all", label: "Todas as Origens" },
  { key: "mercado_pago", label: QUOTE_SOURCE_LABELS.mercado_pago },
  { key: "mercado_livre", label: QUOTE_SOURCE_LABELS.mercado_livre },
  { key: "shopee", label: QUOTE_SOURCE_LABELS.shopee },
  { key: "tiktok_shop", label: QUOTE_SOURCE_LABELS.tiktok_shop },
  { key: "manual", label: QUOTE_SOURCE_LABELS.manual },
];

function periodStart(period: PeriodKey): Date {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function FinancePage() {
  const { paid } = useSubscription();

  if (!paid) {
    return (
      <>
        <Topbar title="Financeiro" />
        <main className="px-6 py-8 md:px-8">
          <UpgradeGate
            title="Financeiro é recurso pago"
            description="Receita bruta, custos, lucro líquido real, vendas canceladas e gráfico de evolução — disponível nos planos Mensal e Trimestral."
          />
        </main>
      </>
    );
  }

  return <FinancePageContent />;
}

function FinancePageContent() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expenses, setExpenses] = useState<ExtraPurchase[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [source, setSource] = useState<"all" | QuoteSource>("all");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [fixedExpenseModalOpen, setFixedExpenseModalOpen] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState<FixedExpense | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadAll();
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

    const [{ data: quoteData }, { data: expenseData }, { data: fixedExpenseData }] = await Promise.all([
      supabase.from("quotes").select("*").eq("user_id", user.id),
      supabase.from("extra_purchases").select("*").eq("user_id", user.id).order("purchased_at", { ascending: false }),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id).order("name"),
    ]);

    setQuotes((quoteData as Quote[]) ?? []);
    setExpenses((expenseData as ExtraPurchase[]) ?? []);
    setFixedExpenses((fixedExpenseData as FixedExpense[]) ?? []);
    setLoading(false);
  }

  async function handleDeleteFixedExpense(id: string) {
    if (!confirm("Excluir esta despesa fixa? Essa ação não pode ser desfeita.")) return;
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("fixed_expenses").delete().eq("id", id);
  }

  const start = useMemo(() => periodStart(period), [period]);

  const periodQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        if (new Date(q.sent_at) < start) return false;
        if (source !== "all" && q.source !== source) return false;
        return true;
      }),
    [quotes, start, source]
  );

  const periodExpenses = useMemo(
    () => expenses.filter((e) => new Date(e.purchased_at) >= start),
    [expenses, start]
  );

  const revenueQuotes = periodQuotes.filter(
    (q) => q.status === "paid" || q.status === "in_production" || q.status === "shipped"
  );
  const cancelledQuotes = periodQuotes.filter((q) => q.status === "cancelled");

  const receitaBruta = revenueQuotes.reduce((s, q) => s + q.final_price, 0);
  const custosVendas = revenueQuotes.reduce((s, q) => s + q.platform_fee + q.cost_amount, 0);
  const custosDespesas = periodExpenses.reduce((s, e) => s + e.amount, 0);
  // Despesa fixa é recorrente mensal — só entra no cálculo quando o filtro é
  // "Este mês" (conta uma vez, o valor cheio); nos outros períodos (Hoje/7
  // dias) não representa fielmente uma fração do mês, então não conta.
  const custosFixos = period === "month" ? fixedExpenses.filter((e) => e.active).reduce((s, e) => s + e.amount, 0) : 0;
  const custosTotais = custosVendas + custosDespesas + custosFixos;
  const lucroLiquidoReal = receitaBruta - custosTotais;
  const vendasCanceladas = cancelledQuotes.reduce((s, q) => s + q.final_price, 0);

  const chartData = useMemo<FinancialEvolutionPoint[]>(() => {
    const buckets = new Map<string, { receita: number; custo: number; order: number }>();
    for (const q of revenueQuotes) {
      const d = new Date(q.sent_at);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const b = buckets.get(key) ?? { receita: 0, custo: 0, order: d.getTime() };
      b.receita += q.final_price;
      b.custo += q.platform_fee + q.cost_amount;
      buckets.set(key, b);
    }
    for (const e of periodExpenses) {
      const d = new Date(e.purchased_at);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const b = buckets.get(key) ?? { receita: 0, custo: 0, order: d.getTime() };
      b.custo += e.amount;
      buckets.set(key, b);
    }
    return Array.from(buckets.entries())
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([label, v]) => ({ label, receita: v.receita, custo: v.custo, lucro: v.receita - v.custo }));
  }, [revenueQuotes, periodExpenses]);

  function handleExportCsv() {
    const rows = [
      ["Tipo", "Data", "Descrição", "Origem/Categoria", "Valor"],
      ...revenueQuotes.map((q) => [
        "Venda",
        new Date(q.sent_at).toLocaleDateString("pt-BR"),
        q.project_name,
        QUOTE_SOURCE_LABELS[q.source],
        String(q.final_price),
      ]),
      ...periodExpenses.map((e) => [
        "Despesa",
        new Date(e.purchased_at).toLocaleDateString("pt-BR"),
        e.description,
        e.category ?? "",
        String(-e.amount),
      ]),
      ...(period === "month"
        ? fixedExpenses
            .filter((e) => e.active)
            .map((e) => [
              "Despesa Fixa",
              new Date().toLocaleDateString("pt-BR"),
              e.name,
              e.category ?? "",
              String(-e.amount),
            ])
        : []),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "";
      const sourceLabel = source === "all" ? "Todas" : QUOTE_SOURCE_LABELS[source];

      doc.setFontSize(16);
      doc.text("Relatório Financeiro — StudioMaker", 15, 20);
      doc.setFontSize(10);
      doc.text(`Período: ${periodLabel} · Origem: ${sourceLabel}`, 15, 28);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 15, 34);

      const rows: [string, string][] = [
        ["Receita Bruta", formatBRL(receitaBruta)],
        ["Custos Totais", formatBRL(custosTotais)],
        ["Lucro Líquido Real", formatBRL(lucroLiquidoReal)],
        ["Vendas Canceladas", formatBRL(vendasCanceladas)],
        ["Total de vendas no período", String(revenueQuotes.length)],
        ["Total de despesas no período", String(periodExpenses.length)],
        ...(period === "month"
          ? ([["Despesas fixas do mês", formatBRL(custosFixos)]] as [string, string][])
          : []),
      ];

      let y = 48;
      doc.setFontSize(12);
      for (const [label, value] of rows) {
        doc.text(label, 15, y);
        doc.text(value, 120, y);
        y += 9;
      }

      doc.save(`relatorio-financeiro-${period}.pdf`);
    } finally {
      setGeneratingReport(false);
    }
  }

  return (
    <>
      <Topbar title="Financeiro" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-card flex flex-wrap gap-1 p-1">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "flex min-h-[44px] items-center justify-center rounded-pill px-4 py-2 text-xs font-medium transition-colors sm:min-h-0",
                    period === p.key ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as "all" | QuoteSource)}
              className="glass-input"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s.key} value={s.key} className="bg-bg-raised">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <NeonButton variant="outline" onClick={() => setExpenseModalOpen(true)}>
              <Plus size={16} /> Nova Despesa
            </NeonButton>
            <NeonButton
              variant="outline"
              onClick={() => {
                setEditingFixedExpense(null);
                setFixedExpenseModalOpen(true);
              }}
            >
              <Repeat size={16} /> Nova Despesa Fixa
            </NeonButton>
            <NeonButton variant="outline" onClick={handleExportCsv} disabled={loading}>
              <Download size={16} /> Exportar CSV
            </NeonButton>
            <NeonButton onClick={handleGenerateReport} disabled={generatingReport || loading}>
              {generatingReport ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Gerar Relatório
            </NeonButton>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Receita Bruta" value={formatBRL(receitaBruta)} icon={DollarSign} accent="pink" />
              <KpiCard label="Custos Totais" value={formatBRL(custosTotais)} icon={TrendingDown} accent="orange" />
              <KpiCard label="Lucro Líquido Real" value={formatBRL(lucroLiquidoReal)} icon={TrendingUp} accent="green" />
              <KpiCard label="Vendas Canceladas" value={formatBRL(vendasCanceladas)} icon={XCircle} accent="purple" />
            </section>

            <GlassAccordion title="Evolução de Vendas" subtitle="Receita x Custo x Lucro no período" defaultOpen>
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">Sem dados nesse período.</p>
              ) : (
                <FinancialEvolutionChart data={chartData} />
              )}
            </GlassAccordion>

            <section>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
                Despesas no período ({periodExpenses.length})
              </h3>
              {periodExpenses.length === 0 ? (
                <GlassCard padding="lg" className="text-center text-sm text-text-muted">
                  Nenhuma despesa registrada nesse período.
                </GlassCard>
              ) : (
                <div className="glass-card divide-y divide-border-glass overflow-hidden">
                  {periodExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">{e.description}</p>
                        <p className="text-xs text-text-muted">
                          {e.category ?? "Sem categoria"} · {new Date(e.purchased_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="font-numeric shrink-0 text-sm font-medium text-red-400">
                        -{formatBRL(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-1 text-sm font-medium uppercase tracking-wider text-text-muted">
                Despesas Fixas ({fixedExpenses.length})
              </h3>
              <p className="mb-4 text-[11px] text-text-muted">
                Recorrentes mensais (aluguel, energia, internet...) — entram no cálculo de custos só quando o
                período selecionado é &quot;Este mês&quot;, contando uma vez o valor cheio.
              </p>
              {fixedExpenses.length === 0 ? (
                <GlassCard padding="lg" className="text-center text-sm text-text-muted">
                  Nenhuma despesa fixa cadastrada ainda.
                </GlassCard>
              ) : (
                <div className="glass-card divide-y divide-border-glass overflow-hidden">
                  {fixedExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-text-primary">{e.name}</p>
                          {!e.active && (
                            <span className="shrink-0 rounded-pill border border-border-glass px-2 py-0.5 text-[10px] text-text-muted">
                              Inativa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">
                          {e.category ?? "Sem categoria"}
                          {e.due_day ? ` · vence dia ${e.due_day}` : ""}
                        </p>
                      </div>
                      <div className="-mr-1.5 flex shrink-0 items-center gap-1">
                        <span className="font-numeric text-sm font-medium text-red-400">-{formatBRL(e.amount)}</span>
                        <button
                          onClick={() => {
                            setEditingFixedExpense(e);
                            setFixedExpenseModalOpen(true);
                          }}
                          className="p-2 text-text-muted hover:text-neon-pink"
                          aria-label="Editar despesa fixa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteFixedExpense(e.id)}
                          className="p-2 text-text-muted hover:text-red-400"
                          aria-label="Excluir despesa fixa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <CouponsPeriodSummary />

            <CouponsCampaignsSection source={source} />
          </>
        )}
      </main>

      <ExtraPurchaseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSaved={() => loadAll()}
      />
      <FixedExpenseModal
        open={fixedExpenseModalOpen}
        expense={editingFixedExpense}
        onClose={() => {
          setFixedExpenseModalOpen(false);
          setEditingFixedExpense(null);
        }}
        onSaved={(saved) => {
          setFixedExpenses((prev) => {
            const exists = prev.some((e) => e.id === saved.id);
            return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
          });
        }}
      />
    </>
  );
}
