import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PrinterCard } from "@/components/dashboard/PrinterCard";
import { SalesPeriodSummary } from "@/components/dashboard/SalesPeriodSummary";
import { TopProductsCard } from "@/components/dashboard/TopProductsCard";
import { DashboardClock } from "@/components/dashboard/DashboardClock";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { DollarSign, TrendingUp, Layers, Server, Plus } from "lucide-react";
import type { Printer } from "@/lib/types";

// Seção "Impressoras em Tempo Real" escondida por enquanto — troque pra true pra reativar.
const SHOW_PRINTER_FARM = false;

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
  const [printers, studioName, financials] = await Promise.all([
    getPrinters(),
    getStudioName(),
    getPreviousMonthFinancials(),
  ]);
  const activeCount = printers.filter((p) => p.status === "printing").length;

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="space-y-8 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-secondary">
              Bem-vindo{studioName ? `, ${studioName}` : " de volta"} 👋
            </p>
            <h2 className="font-display text-2xl">Visão Geral</h2>
            <DashboardClock />
          </div>
          <NeonButton>
            <Plus size={16} /> Novo Orçamento
          </NeonButton>
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
          <KpiCard label="Filamento em Kg" value="14.6 kg" delta={-4.2} icon={Layers} accent="orange" />
          <KpiCard label="Status do Farm" value={`${activeCount}/${printers.length} ativas`} icon={Server} accent="purple" />
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
