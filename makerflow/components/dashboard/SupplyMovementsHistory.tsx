"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatOrderNumber } from "@/lib/quotes";
import { SUPPLY_MOVEMENT_TYPE_LABELS } from "@/lib/supplies";
import { formatBRL, cn } from "@/lib/utils";
import type { Supply, SupplyMovementType, SupplyMovementWithSupply } from "@/lib/types";

type PeriodFilter = "7d" | "30d" | "3m" | "all";

const MOVEMENT_BADGE_STYLES: Record<SupplyMovementType, string> = {
  purchase: "bg-neon-green/15 text-neon-green border-neon-green/30",
  sale_consumption: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  manual_adjustment: "bg-white/10 text-text-secondary border-white/10",
};

function periodStart(period: PeriodFilter): Date | null {
  if (period === "all") return null;
  const start = new Date();
  if (period === "7d") start.setDate(start.getDate() - 7);
  else if (period === "30d") start.setDate(start.getDate() - 30);
  else start.setMonth(start.getMonth() - 3);
  return start;
}

export function SupplyMovementsHistory({ supplies, refreshKey }: { supplies: Supply[]; refreshKey: number }) {
  const supabase = createClient();
  const [movements, setMovements] = useState<SupplyMovementWithSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplyFilter, setSupplyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | SupplyMovementType>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyFilter, typeFilter, periodFilter, refreshKey]);

  async function loadMovements() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("supply_movements")
      .select("*, supplies(name, category, unit), quotes(order_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (supplyFilter !== "all") query = query.eq("supply_id", supplyFilter);
    if (typeFilter !== "all") query = query.eq("movement_type", typeFilter);
    const start = periodStart(periodFilter);
    if (start) query = query.gte("created_at", start.toISOString());

    const { data } = await query;
    setMovements((data as SupplyMovementWithSupply[]) ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg">Histórico de Movimentações</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={supplyFilter}
            onChange={(e) => setSupplyFilter(e.target.value)}
            className="glass-input py-2 text-xs"
          >
            <option value="all" className="bg-bg-raised">
              Todos os insumos
            </option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id} className="bg-bg-raised">
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | SupplyMovementType)}
            className="glass-input py-2 text-xs"
          >
            <option value="all" className="bg-bg-raised">
              Todos os tipos
            </option>
            {Object.entries(SUPPLY_MOVEMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-bg-raised">
                {label}
              </option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="glass-input py-2 text-xs"
          >
            <option value="7d" className="bg-bg-raised">
              7 dias
            </option>
            <option value="30d" className="bg-bg-raised">
              30 dias
            </option>
            <option value="3m" className="bg-bg-raised">
              3 meses
            </option>
            <option value="all" className="bg-bg-raised">
              Todo o período
            </option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : movements.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma movimentação encontrada pra esse filtro.
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Insumo</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Quantidade</th>
                  <th className="px-6 py-4 font-medium">Custo unit.</th>
                  <th className="px-6 py-4 font-medium">Venda</th>
                  <th className="px-6 py-4 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border-glass/60">
                    <td className="px-6 py-4 text-text-primary">
                      {m.supplies ? m.supplies.name : "Insumo excluído"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                          MOVEMENT_BADGE_STYLES[m.movement_type]
                        )}
                      >
                        {SUPPLY_MOVEMENT_TYPE_LABELS[m.movement_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 font-numeric font-medium",
                        m.quantity >= 0 ? "text-neon-green" : "text-red-400"
                      )}
                    >
                      {m.quantity >= 0 ? "+" : ""}
                      {m.quantity} {m.supplies?.unit ?? ""}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {m.unit_cost_at_time != null ? formatBRL(m.unit_cost_at_time) : "—"}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {m.quotes ? formatOrderNumber(m.quotes.order_number) : "—"}
                    </td>
                    <td className="px-6 py-4 text-text-muted">{m.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
