import Link from "next/link";
import dynamic from "next/dynamic";
import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrinterCard } from "@/components/dashboard/PrinterCard";
import { SalesPeriodSummary } from "@/components/dashboard/SalesPeriodSummary";
import { SalesGoalsCard } from "@/components/dashboard/SalesGoalsCard";
import { AffiliateSummaryCard } from "@/components/dashboard/AffiliateSummaryCard";
import { OnboardingChecklistCard } from "@/components/dashboard/OnboardingChecklistCard";
import { PriorityAlertsSection } from "@/components/dashboard/PriorityAlertsSection";
import { DashboardClock } from "@/components/dashboard/DashboardClock";
import { GreetingTypewriter } from "@/components/dashboard/GreetingTypewriter";
import { GlassAccordion } from "@/components/ui/GlassAccordion";

const FinancialChart = dynamic(
  () => import("@/components/charts/FinancialChart").then((m) => m.FinancialChart),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-gradient-to-r from-gray-900 to-gray-800" />,
    ssr: false,
  }
);
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { TIER_LIMITS, isPaid } from "@/lib/entitlements";
import { DollarSign, TrendingUp, Layers, Server, Plus, Package, ClipboardList, Users } from "lucide-react";
import type { Printer, SubscriptionTier, Quote } from "@/lib/types";

// Seção "Impressoras em Tempo Real" (telemetria via bridge/webhook) escondida
// por padrão, substituída pelo controle patrimonial em Cadastros → Impressoras.
// Reative via env var NEXT_PUBLIC_ENABLE_REALTIME_TELEMETRY=true.
const SHOW_PRINTER_FARM = process.env.NEXT_PUBLIC_ENABLE_REALTIME_TELEMETRY === "true";

async function getDashboardData(): Promise<{
  printers: Printer[];
  farmStatus: { active: number; total: number };
  filamentStockKg: number;
  studioName: string | null;
  subscriptionTier: SubscriptionTier;
}> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) {
    return {
      printers: [],
      farmStatus: { active: 0, total: 0 },
      filamentStockKg: 0,
      studioName: null,
      subscriptionTier: "free",
    };
  }

  // ✅ All queries in parallel (batched)
  const [
    { data: printers },
    { data: assets },
    { data: filaments },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("printers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("printer_assets").select("status").eq("user_id", user.id),
    supabase.from("filaments").select("remaining_weight_g").eq("user_id", user.id),
    supabase.from("profiles").select("studio_name,subscription_tier").eq("id", user.id).single(),
  ]);

  const assetRows = assets ?? [];
  const filamentRows = filaments ?? [];
  const totalGrams = filamentRows.reduce((s, f) => s + (f.remaining_weight_g ?? 0), 0);

  return {
    printers: (printers as Printer[]) ?? [],
    farmStatus: {
      active: assetRows.filter((r) => r.status === "active").length,
      total: assetRows.length,
    },
    filamentStockKg: totalGrams / 1000,
    studioName: profile?.studio_name ?? null,
    subscriptionTier: (profile?.subscription_tier as SubscriptionTier) ?? "free",
  };
}

/** Plano Grátis: só contagens simples (sem detalhamento financeiro). */
async function getSimpleCounts(): Promise<{ clients: number; products: number; filaments: number }> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return { clients: 0, products: 0, filaments: 0 };

  const [clients, products, filaments] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("filaments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return {
    clients: clients.count ?? 0,
    products: products.count ?? 0,
    filaments: filaments.count ?? 0,
  };
}

/** Plano Grátis: só vendas manuais de hoje (sem filtro de período, sem outras origens). */
async function getTodayManualSales(): Promise<Quote[]> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", "manual")
    .gte("sent_at", todayStart.toISOString())
    .order("sent_at", { ascending: false });

  return (data as Quote[]) ?? [];
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

function DashboardHeader({ studioName }: { studioName: string | null }) {
  return (
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
  );
}

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();
  const { studioName, subscriptionTier: tier, filamentStockKg } = dashboardData;

  if (!isPaid(tier)) {
    const [counts, todaySales] = await Promise.all([
      getSimpleCounts(),
      getTodayManualSales(),
    ]);

    return (
      <>
        <Topbar title="Dashboard" />
        <main className="space-y-8 px-6 py-8 md:px-8">
          <DashboardHeader studioName={studioName} />

          <OnboardingChecklistCard />

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Clientes" value={`${counts.clients}/${TIER_LIMITS.free.clients}`} icon={Users} accent="pink" />
            <KpiCard label="Produtos" value={`${counts.products}/${TIER_LIMITS.free.products}`} icon={Package} accent="orange" />
            <KpiCard label="Filamento em Estoque" value={`${filamentStockKg.toFixed(1)} kg`} icon={Layers} accent="green" />
            <KpiCard label="Rolos de Filamento" value={`${counts.filaments}/${TIER_LIMITS.free.filaments}`} icon={Layers} accent="purple" />
          </section>

          <section>
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
              Vendas Manuais de Hoje
            </h3>
            {todaySales.length === 0 ? (
              <GlassCard padding="lg" className="text-center text-sm text-text-muted">
                Nenhuma venda manual registrada hoje ainda.
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {todaySales.map((q) => (
                  <div key={q.id} className="glass-card flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">{q.buyer_name || q.project_name}</p>
                      <p className="text-xs text-text-muted">{new Date(q.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className="font-numeric shrink-0 text-sm font-medium text-neon-green">
                      {formatBRL(q.final_price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <GlassCard padding="lg" className="text-center text-sm text-text-secondary">
            Resumo por período, produtos mais vendidos, gráfico de evolução e mais são recursos dos planos
            pagos.{" "}
            <Link href="/dashboard/subscription" className="text-neon-pink hover:underline">
              Assine agora
            </Link>
            .
          </GlassCard>
        </main>
      </>
    );
  }

  const financials = await getPreviousMonthFinancials();
  const { printers, farmStatus } = dashboardData;

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="space-y-8 px-6 py-8 md:px-8">
        <DashboardHeader studioName={studioName} />

        <OnboardingChecklistCard />

        {/* Resumo de vendas por período + metas do mês + indicações */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SalesPeriodSummary />
          <SalesGoalsCard />
          <AffiliateSummaryCard />
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

        {/* Atenção prioritária */}
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Atenção Prioritária</h3>
          <PriorityAlertsSection />
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
