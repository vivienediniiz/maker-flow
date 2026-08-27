"use client";

import { cn } from "@/lib/utils";

const SPOOLS = [
  { brand: "Voolt3D", material: "PLA", color: "#FF4EDF", pct: 78, low: false },
  { brand: "3DFila", material: "PETG", color: "#00FF9D", pct: 92, low: false },
  { brand: "Voolt3D", material: "PLA", color: "#E86333", pct: 14, low: true },
  { brand: "Cliever", material: "ABS", color: "#AA17DB", pct: 55, low: false },
];

export function FilamentShelfMockup() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <p className="font-display text-sm text-text-primary">Filamentos</p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {SPOOLS.map((s, i) => (
          <div key={i} className="glass-card flex flex-col items-center gap-2 p-2.5">
            <div className="relative h-10 w-10">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3"
                  strokeDasharray={`${s.pct * 0.94} 94`}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="absolute inset-[7px] rounded-full"
                style={{ background: s.color, opacity: 0.25 }}
              />
            </div>
            <div className="text-center">
              <p className="text-[9px] font-medium text-text-primary">{s.brand}</p>
              <p className="text-[8px] text-text-muted">{s.material}</p>
              <p className={cn("text-[8px] font-medium", s.low ? "text-red-400" : "text-text-secondary")}>
                {s.pct}% {s.low && "· baixo"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
