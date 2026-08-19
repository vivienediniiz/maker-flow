"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatOrderNumber } from "@/lib/quotes";
import { FILAMENT_MOVEMENT_TYPE_LABELS } from "@/lib/filaments";
import { cn } from "@/lib/utils";
import type { Filament, FilamentMovementType, FilamentMovementWithFilament } from "@/lib/types";

type PeriodFilter = "7d" | "30d" | "3m" | "all";

const MOVEMENT_BADGE_STYLES: Record<FilamentMovementType, string> = {
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

export function FilamentMovementsHistory({ filaments, refreshKey }: { filaments: Filament[]; refreshKey: number }) {
  const supabase = createClient();
  const [movements, setMovements] = useState<FilamentMovementWithFilament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filamentFilter, setFilamentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | FilamentMovementType>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filamentFilter, typeFilter, periodFilter, refreshKey]);

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
      .from("filament_movements")
      .select("*, filaments(brand, material, color_hex), quotes(order_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filamentFilter !== "all") query = query.eq("filament_id", filamentFilter);
    if (typeFilter !== "all") query = query.eq("movement_type", typeFilter);
    const start = periodStart(periodFilter);
    if (start) query = query.gte("created_at", start.toISOString());

    const { data } = await query;
    setMovements((data as FilamentMovementWithFilament[]) ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg">Histórico de Movimentações</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={filamentFilter}
            onChange={(e) => setFilamentFilter(e.target.value)}
            className="glass-input py-2 text-xs"
          >
            <option value="all" className="bg-bg-raised">
              Todos os filamentos
            </option>
            {filaments.map((f) => (
              <option key={f.id} value={f.id} className="bg-bg-raised">
                {f.material} — {f.brand}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | FilamentMovementType)}
            className="glass-input py-2 text-xs"
          >
            <option value="all" className="bg-bg-raised">
              Todos os tipos
            </option>
            {Object.entries(FILAMENT_MOVEMENT_TYPE_LABELS).map(([value, label]) => (
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
                  <th className="px-6 py-4 font-medium">Filamento</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Quantidade</th>
                  <th className="px-6 py-4 font-medium">Venda</th>
                  <th className="px-6 py-4 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border-glass/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {m.filaments && (
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                            style={{ backgroundColor: m.filaments.color_hex }}
                          />
                        )}
                        <span className="text-text-primary">
                          {m.filaments ? `${m.filaments.material} — ${m.filaments.brand}` : "Filamento excluído"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                          MOVEMENT_BADGE_STYLES[m.movement_type]
                        )}
                      >
                        {FILAMENT_MOVEMENT_TYPE_LABELS[m.movement_type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 font-numeric font-medium",
                        m.quantity_g >= 0 ? "text-neon-green" : "text-red-400"
                      )}
                    >
                      {m.quantity_g >= 0 ? "+" : ""}
                      {m.quantity_g}g
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
