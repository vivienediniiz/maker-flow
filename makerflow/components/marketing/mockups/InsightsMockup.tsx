"use client";

import { Trophy, Users, Disc3, Percent } from "lucide-react";

const RANKINGS = [
  { icon: Trophy, label: "Produto Mais Lucrativo", value: "Vaso Geométrico (R$ 612,40)" },
  { icon: Users, label: "Cliente Top", value: "Ana Beatriz (R$ 890,00)" },
  { icon: Disc3, label: "Filamento Mais Usado", value: "PLA — Voolt3D (3.240g)" },
  { icon: Percent, label: "Maior Margem %", value: "Chaveiro Personalizado (71%)" },
];

export function InsightsMockup() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <p className="font-display text-sm text-text-primary">Insights & BI</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RANKINGS.map((r) => (
          <div key={r.label} className="glass-card flex items-center gap-2.5 p-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
              <r.icon size={13} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[8px] text-text-muted">{r.label}</p>
              <p className="truncate text-[9px] font-medium text-text-primary">{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
