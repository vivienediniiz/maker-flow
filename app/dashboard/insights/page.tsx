"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FilamentTank } from "@/components/dashboard/FilamentTank";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Trophy, Users, Layers, Percent, Package, Repeat, Wallet, Loader2 } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import type { Filament } from "@/lib/types";

type Period = "30d" | "3m" | "1y";

function periodStart(period: Period) {
  const start = new Date();
  if (period === "30d") start.setDate(start.getDate() - 30);
  else if (period === "3m") start.setMonth(start.getMonth() - 3);
  else start.setFullYear(start.getFullYear() - 1);
  return start;
}

// Embeds de relacionamento do Supabase podem vir como objeto ou array de 1
// item dependendo de como a FK e detectada — normaliza pros dois casos.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

interface RankingCard {
  icon: typeof Trophy;
  label: string;
  value: string | null;
  emptyMessage: string;
}

interface ScatterPoint {
  name: string;
  venda: number;
  lucro: number;
}

interface ProductAgg {
  name: string;
  revenue: number;
  cost: number;
  qty: number;
  profit: number;
}

export default function InsightsPage() {
  const { paid } = useSubscription();

  if (!paid) {
    return (
      <>
        <Topbar title="Insights & BI" />
        <main className="px-6 py-8 md:px-8">
          <UpgradeGate
            title="Insights & BI é recurso pago"
            description="Rankings, matriz venda x lucro e prateleira de filamentos — disponível nos planos Starter e Pro."
          />
        </main>
      </>
    );
  }

  return <InsightsPageContent />;
}

function InsightsPageContent() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<RankingCard[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const start = periodStart(period);
    const cutoff = start.toISOString();
    const cutoffDate = cutoff.slice(0, 10);

    const [quotesRes, filamentMovementsRes, filamentsRes, extraPurchasesRes] = await Promise.all([
      // `quotes` é a fonte única e completa de vendas do app (Venda Manual,
      // Baixa Rápida, Mercado Pago/Livre, Loja Online) — ao contrário de
      // `sales`, que só era alimentada pelo botão "Baixa Rápida" do Estoque.
      supabase
        .from("quotes")
        .select(
          "id, product_id, quantity, final_price, cost_amount, platform_fee, client_id, sent_at, products(id, name), clients(id, name)"
        )
        .eq("user_id", user.id)
        .in("status", ["paid", "in_production", "shipped"])
        .gte("sent_at", cutoff),
      // Consumo real de filamento por venda (criado junto com a Venda Manual
      // quando tem "Filamento(s) Utilizados"), muito mais confiável que o
      // campo `sales.filament_id` (nunca preenchido por nenhum fluxo).
      supabase
        .from("filament_movements")
        .select("quantity_g, filament_id, filaments(id, brand, material)")
        .eq("user_id", user.id)
        .eq("movement_type", "sale_consumption")
        .gte("created_at", cutoff),
      supabase.from("filaments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("extra_purchases")
        .select("id, amount, purchased_at")
        .eq("user_id", user.id)
        .gte("purchased_at", cutoffDate),
    ]);

    const quotes = quotesRes.data ?? [];

    const productAgg = new Map<string, ProductAgg>();
    for (const row of quotes) {
      const product = one<{ id: string; name: string }>(row.products as never);
      if (!row.product_id || !product) continue;
      const revenue = Number(row.final_price) || 0;
      const cost = (Number(row.cost_amount) || 0) + (Number(row.platform_fee) || 0);
      const qty = Number(row.quantity) || 1;
      const entry = productAgg.get(row.product_id) ?? { name: product.name, revenue: 0, cost: 0, qty: 0, profit: 0 };
      entry.revenue += revenue;
      entry.cost += cost;
      entry.qty += qty;
      entry.profit += revenue - cost;
      productAgg.set(row.product_id, entry);
    }

    const filamentAgg = new Map<string, { label: string; qty: number }>();
    for (const row of filamentMovementsRes.data ?? []) {
      const filament = one<{ id: string; brand: string; material: string }>(row.filaments as never);
      if (!row.filament_id || !filament) continue;
      const label = `${filament.material} — ${filament.brand}`;
      const entry = filamentAgg.get(row.filament_id) ?? { label, qty: 0 };
      entry.qty += Math.abs(Number(row.quantity_g)) || 0;
      filamentAgg.set(row.filament_id, entry);
    }

    const clientAgg = new Map<string, { name: string; total: number; count: number }>();
    for (const row of quotes) {
      const client = one<{ id: string; name: string }>(row.clients as never);
      if (row.client_id && client) {
        const entry = clientAgg.get(row.client_id) ?? { name: client.name, total: 0, count: 0 };
        entry.total += Number(row.final_price) || 0;
        entry.count += 1;
        clientAgg.set(row.client_id, entry);
      }
    }

    const products = Array.from(productAgg.values());
    const clients = Array.from(clientAgg.values());
    const filamentsUsed = Array.from(filamentAgg.values());

    const marginOf = (p: ProductAgg) => (p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0);

    const topProfit = products.length ? products.reduce((a, b) => (b.profit > a.profit ? b : a)) : null;
    const topQty = products.length ? products.reduce((a, b) => (b.qty > a.qty ? b : a)) : null;
    const topMargin = products.length ? products.reduce((a, b) => (marginOf(b) > marginOf(a) ? b : a)) : null;
    const topClient = clients.length ? clients.reduce((a, b) => (b.total > a.total ? b : a)) : null;
    const topFilament = filamentsUsed.length ? filamentsUsed.reduce((a, b) => (b.qty > a.qty ? b : a)) : null;

    const distinctClients = clients.length;
    const repeatClients = clients.filter((c) => c.count > 1).length;
    const repeatRate = distinctClients > 0 ? (repeatClients / distinctClients) * 100 : null;

    // Lucro líquido usa TODAS as vendas do período (com ou sem produto de
    // catálogo vinculado, igual ao cálculo do Financeiro), diferente dos
    // cards de produto acima, que só cobrem vendas com product_id.
    const totalRevenue = quotes.reduce((sum, q) => sum + (Number(q.final_price) || 0), 0);
    const totalCost = quotes.reduce(
      (sum, q) => sum + (Number(q.cost_amount) || 0) + (Number(q.platform_fee) || 0),
      0
    );
    const totalExtraPurchases = (extraPurchasesRes.data ?? []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );
    const hasNetProfitData = quotes.length > 0 || totalExtraPurchases > 0;
    const netProfit = hasNetProfitData ? totalRevenue - totalCost - totalExtraPurchases : null;

    setRankings([
      {
        icon: Trophy,
        label: "Produto Mais Lucrativo",
        value: topProfit ? `${topProfit.name} (${formatBRL(topProfit.profit)})` : null,
        emptyMessage: "Sem vendas registradas neste período",
      },
      {
        icon: Users,
        label: "Cliente Top",
        value: topClient ? `${topClient.name} (${formatBRL(topClient.total)})` : null,
        emptyMessage: "Sem pedidos registrados neste período",
      },
      {
        icon: Layers,
        label: "Filamento Mais Usado",
        value: topFilament ? `${topFilament.label} (${Math.round(topFilament.qty)}g)` : null,
        emptyMessage: "Nenhuma venda com filamento vinculado ainda",
      },
      {
        icon: Percent,
        label: "Maior Margem %",
        value: topMargin ? `${topMargin.name} (${marginOf(topMargin).toFixed(0)}%)` : null,
        emptyMessage: "Sem vendas registradas neste período",
      },
      {
        icon: Package,
        label: "Mais Vendido (un.)",
        value: topQty ? `${topQty.name} (${topQty.qty} un.)` : null,
        emptyMessage: "Sem vendas registradas neste período",
      },
      {
        icon: Repeat,
        label: "Taxa de Recompra",
        value: repeatRate !== null ? `${repeatRate.toFixed(0)}%` : null,
        emptyMessage: "Sem pedidos registrados neste período",
      },
      {
        icon: Wallet,
        label: "Lucro Líquido (após compras extras)",
        value: netProfit !== null ? formatBRL(netProfit) : null,
        emptyMessage: "Sem vendas ou compras extras neste período",
      },
    ]);

    setScatterData(
      products.map((p) => ({
        name: p.name,
        venda: Math.round(p.revenue * 100) / 100,
        lucro: Math.round(p.profit * 100) / 100,
      }))
    );
    setFilaments((filamentsRes.data as Filament[]) ?? []);
    setLoading(false);
  }

  return (
    <>
      <Topbar title="Insights & BI" />
      <main className="space-y-8 px-6 py-8 md:px-8">
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          options={[
            { value: "30d", label: "30 dias" },
            { value: "3m", label: "3 meses" },
            { value: "1y", label: "1 ano" },
          ]}
        />

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rankings.map((r) => (
                <GlassCard key={r.label} hover padding="md" className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                    <r.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-text-muted">{r.label}</p>
                    {r.value ? (
                      <p className="truncate text-sm font-medium text-text-primary">{r.value}</p>
                    ) : (
                      <p className="truncate text-xs text-text-muted">{r.emptyMessage}</p>
                    )}
                  </div>
                </GlassCard>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
              <GlassCard padding="lg">
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
                  Matriz Venda x Lucro
                </h3>
                {scatterData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-center text-sm text-text-muted">
                    Sem vendas registradas neste período.
                  </div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="venda" name="Venda" unit=" R$" stroke="#726C85" fontSize={11} />
                        <YAxis dataKey="lucro" name="Lucro" unit=" R$" stroke="#726C85" fontSize={11} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={<ScatterTooltip />}
                        />
                        <Scatter data={scatterData} fill="#FF4EDF" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </GlassCard>

              <GlassCard padding="lg">
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
                  Prateleira de Filamentos
                </h3>
                {filaments.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-center text-sm text-text-muted">
                    Nenhum filamento cadastrado ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filaments.map((f) => (
                      <FilamentTank key={f.id} filament={f} />
                    ))}
                  </div>
                )}
              </GlassCard>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function ScatterTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as ScatterPoint;
  return (
    <div
      style={{ background: "#17132A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
      className="px-3 py-2 text-text-primary"
    >
      <p className="mb-1 font-medium">{point.name}</p>
      <p className="text-text-secondary">Venda: {formatBRL(point.venda)}</p>
      <p className="text-text-secondary">Lucro: {formatBRL(point.lucro)}</p>
    </div>
  );
}
