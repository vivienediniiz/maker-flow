interface FilamentGraduatedGaugeProps {
  colorHex: string;
  remainingG: number;
  totalG: number;
}

const CYLINDER_WIDTH = 40;
const CYLINDER_HEIGHT = 132;
const LABEL_GAP = 6;
const LABEL_WIDTH = 32;

/**
 * Escolhe o intervalo de graduação: base de 100g (rolos ate 1kg) ou 200g
 * (rolos maiores), multiplicada até caber entre 4 e 6 linhas no total —
 * sem isso um rolo de 3kg teria 15 marcações de 200g em 200 e poucos px.
 */
function pickTickStep(total: number): number {
  const base = total <= 1000 ? 100 : 200;
  let step = base;
  while (total / step > 6) step += base;
  return step;
}

/** Indicador tipo proveta de laboratório: pill vertical com marcações graduadas em gramas. */
export function FilamentGraduatedGauge({ colorHex, remainingG, totalG }: FilamentGraduatedGaugeProps) {
  const total = totalG > 0 ? totalG : 1000;
  const fillPercent = Math.max(0, Math.min(100, (remainingG / total) * 100));
  const step = pickTickStep(total);
  const ticks: number[] = [];
  for (let v = step; v < total; v += step) ticks.push(v);

  return (
    <div className="relative" style={{ height: CYLINDER_HEIGHT, width: CYLINDER_WIDTH + LABEL_GAP + LABEL_WIDTH }}>
      <div
        className="absolute left-0 top-0 overflow-hidden rounded-b-2xl rounded-t-md border border-white/10 bg-white/[0.03]"
        style={{ width: CYLINDER_WIDTH, height: CYLINDER_HEIGHT }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-all"
          style={{ height: `${fillPercent}%`, backgroundColor: colorHex, opacity: 0.85 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
      </div>

      {ticks.map((t) => {
        const pct = (t / total) * 100;
        return (
          <div
            key={t}
            className="absolute left-0 flex items-center"
            style={{ bottom: `${pct}%`, transform: "translateY(50%)" }}
          >
            {/* mix-blend-mode difference: mantem a linha visivel tanto sobre o track escuro quanto sobre a cor do filamento, seja qual for */}
            <span className="h-px shrink-0 bg-white" style={{ width: CYLINDER_WIDTH, mixBlendMode: "difference" }} />
            <span className="pl-1.5 text-[9px] leading-none text-text-muted">{t}g</span>
          </div>
        );
      })}
    </div>
  );
}
