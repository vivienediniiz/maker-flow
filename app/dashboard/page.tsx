import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PrinterCard } from "@/components/dashboard/PrinterCard";
import { GlassAccordion } from "@/components/ui/GlassAccordion";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";
import { DollarSign, TrendingUp, Layers, Server, Plus } from "lucide-react";
import type { Printer } from "@/lib/types";

// Placeholder data — replace with server-side fetch from Supabase
const printers: Printer[] = [
  {
    id: "1",
    user_id: "u1",
    name: "Farm 01",
    model: "Bambu Lab X1C",
    watts_power: 350,
    cost_per_hour: 0.42,
    status: "printing",
    api_key_webhook: null,
    current_job: {
      file_name: "dragao_articulado_v2.stl",
      progress_percent: 68,
      eta_minutes: 47,
      nozzle_temp_c: 230,
      bed_temp_c: 60,
    },
  },
  {
    id: "2",
    user_id: "u1",
    name: "Farm 02",
    model: "Prusa MK4",
    watts_power: 220,
    cost_per_hour: 0.28,
    status: "printing",
    api_key_webhook: null,
    current_job: {
      file_name: "suporte_monitor.stl",
      progress_percent: 23,
      eta_minutes: 112,
      nozzle_temp_c: 215,
      bed_temp_c: 55,
    },
  },
  {
    id: "3",
    user_id: "u1",
    name: "Farm 03",
    model: "Ender 3 V3",
    watts_power: 180,
    cost_per_hour: 0.19,
    status: "idle",
    api_key_webhook: null,
  },
  {
    id: "4",
    user_id: "u1",
    name: "Farm 04",
    model: "Bambu Lab P1S",
    watts_power: 300,
    cost_per_hour: 0.35,
    status: "error",
    api_key_webhook: null,
  },
];

export default function DashboardPage() {
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
          <KpiCard label="Status do Farm" value="2/4 ativas" icon={Server} accent="purple" />
        </section>

        {/* Printer farm */}
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
            Impressoras em Tempo Real
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {printers.map((p) => (
              <PrinterCard key={p.id} printer={p} />
            ))}
          </div>
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
