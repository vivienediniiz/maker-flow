import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PrinterCard } from "@/components/dashboard/PrinterCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { DollarSign, TrendingUp, Layers, Server, Plus } from "lucide-react";
import type { Printer } from "@/lib/types";

async function getPrinters(): Promise<Printer[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("printers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Printer[]) ?? [];
}

export default async function DashboardPage() {
  const printers = await getPrinters();
  const activeCount = printers.filter((p) => p.status === "printing").length;

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="space-y-8 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-secondary">Bem-vindo de volta 👋</p>
            <h2 className="font-display text-2xl">Visão geral do estúdio</h2>
          </div>
          <NeonButton>
            <Plus size={16} /> Novo Orçamento
          </NeonButton>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Faturamento Mensal" value={formatBRL(8320)} delta={17.4} icon={DollarSign} accent="pink" />
          <KpiCard label="Lucro Líquido" value={formatBRL(5210)} delta={12.1} icon={TrendingUp} accent="green" />
          <KpiCard label="Filamento em Kg" value="14.6 kg" delta={-4.2} icon={Layers} accent="orange" />
          <KpiCard label="Status do Farm" value={`${activeCount}/${printers.length} ativas`} icon={Server} accent="purple" />
        </section>

        {/* Printer farm */}
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

        {/* Financial evolution */}
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
            Evolução Financeira
          </h3>
          <div className="space-y-3">
            <GlassAccordion
              title="Receita x Custo x Lucro"
              subtitle="Últimos 6 meses"
              defaultOpen
            >
              <FinancialChart />
            </GlassAccordion>
            <GlassAccordion title="Detalhamento por canal de venda" subtitle="Site, WhatsApp, Marketplace">
              <p className="text-sm text-text-secondary">
                Site: {formatBRL(3200)} · WhatsApp: {formatBRL(2900)} · Marketplace: {formatBRL(2220)}
              </p>
            </GlassAccordion>
          </div>
        </section>
      </main>
    </>
  );
}