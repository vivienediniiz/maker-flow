"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

const PRINTERS = [
  { name: "Bambu Lab P1S", branch: "Matriz", value: "R$ 4.200,00", warranty: "Garantia até 03/2027", ok: true },
  { name: "Ender 3 V3 SE", branch: "Matriz", value: "R$ 1.350,00", warranty: "Garantia vencida", ok: false },
  { name: "Bambu Lab A1 Mini", branch: "Filial 2", value: "R$ 2.100,00", warranty: "Garantia até 11/2026", ok: true },
];

export function PrintersMockup() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <p className="font-display text-sm text-text-primary">Impressoras</p>

      <div className="space-y-2">
        {PRINTERS.map((p) => (
          <div key={p.name} className="glass-card flex items-center gap-3 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
              <Printer size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-text-primary">{p.name}</p>
              <p className="text-[8px] text-text-muted">{p.branch} · {p.value}</p>
            </div>
            <span className={cn("shrink-0 rounded-pill px-2 py-0.5 text-[8px] font-medium", p.ok ? "bg-[#00FF9D]/15 text-[#00FF9D]" : "bg-red-500/15 text-red-400")}>
              {p.warranty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
