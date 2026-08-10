"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FilamentTank } from "@/components/dashboard/FilamentTank";
import { formatBRL } from "@/lib/utils";
import { Trophy, Users, Layers, Percent, Package, Repeat } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Filament } from "@/lib/types";

const RANKINGS = [
  { icon: Trophy, label: "Produto Mais Lucrativo", value: "Miniatura Dragão Articulado" },
  { icon: Users, label: "Cliente Top", value: "Loja Geek Center" },
  { icon: Layers, label: "Filamento Mais Usado", value: "PLA Preto — Voolt3D" },
  { icon: Percent, label: "Maior Margem %", value: "Vaso Geométrico (68%)" },
  { icon: Package, label: "Mais Vendido (un.)", value: "Organizador Modular" },
  { icon: Repeat, label: "Taxa de Recompra", value: "34%" },
];

const SCATTER = [
  { venda: 42, lucro: 24 },
  { venda: 69, lucro: 38 },
  { venda: 129, lucro: 71 },
  { venda: 58, lucro: 29 },
  { venda: 95, lucro: 52 },
  { venda: 189, lucro: 98 },
];

const FILAMENTS: Filament[] = [
  { id: "1", user_id: "u1", brand: "Voolt3D", material: "PLA", color_hex: "#111111", price_per_kg: 89, remaining_weight_g: 820 },
  { id: "2", user_id: "u1", brand: "3DFila", material: "PETG", color_hex: "#FF4EDF", price_per_kg: 105, remaining_weight_g: 140 },
  { id: "3", user_id: "u1", brand: "GTMax3D", material: "PLA", color_hex: "#00FF9D", price_per_kg: 79, remaining_weight_g: 610 },
  { id: "4", user_id: "u1", brand: "Voolt3D", material: "ABS", color_hex: "#AA17DB", price_per_kg: 99, remaining_weight_g: 90 },
  { id: "5", user_id: "u1", brand: "3DFila", material: "PLA", color_hex: "#E86333", price_per_kg: 85, remaining_weight_g: 950 },
];

export default function InsightsPage() {
  const [period, setPeriod] = useState<"30d" | "3m" | "1y">("30d");

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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RANKINGS.map((r) => (
            <GlassCard key={r.label} hover padding="md" className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
                <r.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-text-muted">{r.label}</p>
                <p className="truncate text-sm font-medium text-text-primary">{r.value}</p>
              </div>
            </GlassCard>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <GlassCard padding="lg">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
              Matriz Venda x Lucro
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="venda" name="Venda" unit=" R$" stroke="#726C85" fontSize={11} />
                  <YAxis dataKey="lucro" name="Lucro" unit=" R$" stroke="#726C85" fontSize={11} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ background: "#17132A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Scatter data={SCATTER} fill="#FF4EDF" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard padding="lg">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
              Prateleira de Filamentos
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FILAMENTS.map((f) => (
                <FilamentTank key={f.id} filament={f} />
              ))}
            </div>
          </GlassCard>
        </section>
      </main>
    </>
  );
}
