"use client";

const STATS = [
  { label: "Receita Bruta", value: "R$ 8.420,00" },
  { label: "Custos Totais", value: "R$ 3.180,00" },
  { label: "Lucro Líquido", value: "R$ 5.240,00" },
];

/** Pontos normalizados (0-100) — só decorativo. */
const RECEITA_POINTS = [22, 30, 26, 44, 38, 58, 52, 74, 68, 86];
const CUSTO_POINTS = [14, 16, 15, 20, 18, 24, 22, 28, 26, 32];

function buildLinePath(points: number[], w: number, h: number) {
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / 100) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function FinanceMockup() {
  const receitaPath = buildLinePath(RECEITA_POINTS, 100, 48);
  const custoPath = buildLinePath(CUSTO_POINTS, 100, 48);

  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <p className="font-display text-sm text-text-primary">Financeiro</p>

      <div className="grid grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="glass-card space-y-1 p-2">
            <p className="truncate text-[8px] text-text-muted">{s.label}</p>
            <p className="font-numeric text-[10px] font-semibold text-text-primary sm:text-xs">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card space-y-1.5 p-3">
        <div className="flex items-center gap-3 text-[8px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-pink" /> Receita
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-text-muted" /> Custos
          </span>
        </div>
        <svg viewBox="0 0 100 48" className="h-14 w-full" preserveAspectRatio="none">
          <path d={receitaPath} fill="none" stroke="url(#finance-gradient)" strokeWidth="2" strokeLinecap="round" />
          <path d={custoPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="finance-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E86333" />
              <stop offset="50%" stopColor="#FF4EDF" />
              <stop offset="100%" stopColor="#AA17DB" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
