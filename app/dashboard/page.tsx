import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PrinterCard } from "@/components/dashboard/PrinterCard";
import { SalesPeriodSummary } from "@/components/dashboard/SalesPeriodSummary";
import { TopProductsCard } from "@/components/dashboard/TopProductsCard";
import { DashboardClock } from "@/components/dashboard/DashboardClock";
import { GreetingTypewriter } from "@/components/dashboard/GreetingTypewriter";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { DollarSign, TrendingUp, Layers, Server, Plus, Package, ClipboardList } from "lucide-react";
import type { Printer } from "@/lib/types";

// Seção "Impressoras em Tempo Real" (telemetria via bridge/webhook) escondida
// por padrão, substituída pelo controle patrimonial em Cadastros → Impressoras.
// Reative via env var NEXT_PUBLIC_ENABLE_REALTIME_TELEMETRY=true.
const SHOW_PRINTER_FARM = process.env.NEXT_PUBLIC_ENABLE_REALTIME_TELEMETRY === "true";

async function getPrinters(): Promise<Printer[]> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("printers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Printer[]) ?? [];
}

/** "Status do Farm" agora reflete o controle patrimonial (printer_assets), não mais a telemetria. */
async function getPrinterAssetsSummary(): Promise<{ active: number; total: number }> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return { active: 0, total: 0 };

  const { data } = await supabase.from("printer_assets").select("status").eq("user_id", user.id);
  const rows = data ?? [];
  return { active: rows.filter((r) => r.status === "active").length, total: rows.length };
}

/** Soma o que resta de filamento em todos os rolos cadastrados. */
async function getFilamentStockKg(): Promise<number> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return 0;

  const { data } = await supabase.from("filaments").select("remaining_weight_g").eq("user_id", user.id);
  const totalGrams = (data ?? []).reduce((s, f) => s + (f.remaining_weight_g ?? 0), 0);
  return totalGrams / 1000;
}

async function getStudioName(): Promise<string | null> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("studio_name").eq("id", user.id).single();
  return data?.studio_name ?? null;
}

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
}

interface PreviousMonthFinancials {
  revenue: number;
  profit: number;
  revenueDelta?: number;
  profitDelta?: number;
}

/** Faturamento/Lucro sempre do mês anterior (não do mês corrente), com variação em relação ao mês retrasado. */
async function getPreviousMonthFinancials(): Promise<PreviousMonthFinancials> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return { revenue: 0, profit: 0 };

  const lastMonth = monthRange(1);
  const monthBefore = monthRange(2);

  const { data } = await supabase
    .from("quotes")
    .select("final_price, net_amount, sent_at")
    .eq("user_id", user.id)
    .in("status", ["paid", "in_production", "shipped"])
    .gte("sent_at", monthBefore.start.toISOString())
    .lt("sent_at", lastMonth.end.toISOString());

  const rows = data ?? [];
  const lastMonthRows = rows.filter(
    (r) => new Date(r.sent_at) >= lastMonth.start && new Date(r.sent_at) < lastMonth.end
  );
  const beforeRows = rows.filter(
    (r) => new Date(r.sent_at) >= monthBefore.start && new Date(r.sent_at) < monthBefore.end
  );

  const revenue = lastMonthRows.reduce((s, r) => s + r.final_price, 0);
  const profit = lastMonthRows.reduce((s, r) => s + r.net_amount, 0);
  const revenueBefore = beforeRows.reduce((s, r) => s + r.final_price, 0);
  const profitBefore = beforeRows.reduce((s, r) => s + r.net_amount, 0);

  return {
    revenue,
    profit,
    revenueDelta: revenueBefore > 0 ? Math.round(((revenue - revenueBefore) / revenueBefore) * 1000) / 10 : undefined,
    profitDelta: profitBefore > 0 ? Math.round(((profit - profitBefore) / profitBefore) * 1000) / 10 : undefined,
  };
}

export default async function DashboardPage() {
  const [printers, studioName, financials, farmStatus, filamentStockKg] = await Promise.all([
    getPrinters(),
    getStudioName(),
    getPreviousMonthFinancials(),
    getPrinterAssetsSummary(),
    getFilamentStockKg(),
  ]);

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="space-y-8 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-secondary">
              {studioName ? (
                <>
                  Bem-vindo, <GreetingTypewriter name={studioName} /> 👋
                </>
              ) : (
                "Bem-vindo de volta 👋"
              )}
            </p>
            <h2 className="font-display text-2xl">Visão Geral</h2>
            <DashboardClock />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 rounded-pill border border-border-glassStrong px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-neon-pink/60 hover:bg-white/5"
            >
              <Package size={16} /> Produtos
            </Link>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 rounded-pill border border-border-glassStrong px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-neon-pink/60 hover:bg-white/5"
            >
              <ClipboardList size={16} /> Vendas
            </Link>
            <Link href="/dashboard/calculator" className="neon-btn">
              <Plus size={16} /> Novo Orçamento
            </Link>
          </div>
        </div>

        {/* Resumo de vendas por período + produtos mais vendidos */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SalesPeriodSummary />
          <TopProductsCard />
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Faturamento Mensal (mês anterior)"
            value={formatBRL(financials.revenue)}
            delta={financials.revenueDelta}
            icon={DollarSign}
            accent="pink"
          />
          <KpiCard
            label="Lucro Líquido (mês anterior)"
            value={formatBRL(financials.profit)}
            delta={financials.profitDelta}
            icon={TrendingUp}
            accent="green"
          />
          <KpiCard label="Filamento em Estoque" value={`${filamentStockKg.toFixed(1)} kg`} icon={Layers} accent="orange" />
          <KpiCard label="Status do Farm" value={`${farmStatus.active}/${farmStatus.total} ativas`} icon={Server} accent="purple" />
        </section>

        {/* Printer farm */}
        {SHOW_PRINTER_FARM && (
          <section>
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
              Impressoras em Tempo Real
            </h3>
            {printers.length === 0 ? (
              <div className="glass-card px-6 py-8 text-center text-sm text-text-muted">
                Nenhuma impressora cadastrada ainda. Adicione em Cadastros → Impressoras.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {printers.map((p) => (
                  <PrinterCard key={p.id} printer={p} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Financial evolution */}
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
            Evolução Financeira
          </h3>
          <GlassAccordion
            title="Receita x Custo x Lucro"
            subtitle="Últimos 6 meses"
            defaultOpen
          >
            <FinancialChart />
          </GlassAccordion>
        </section>
      </main>
    </>
  );
}
