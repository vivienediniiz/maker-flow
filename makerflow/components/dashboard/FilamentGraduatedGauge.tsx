interface FilamentGraduatedGaugeProps {
  colorHex: string;
  remainingG: number;
  totalG: number;
}

const CYLINDER_WIDTH = 40;
const CYLINDER_HEIGHT = 132;
const LABEL_GAP = 6;
const LABEL_WIDTH = 32;

/** Indicador tipo proveta de laboratório: pill vertical com uma linha de nível dinâmica em gramas. */
export function FilamentGraduatedGauge({ colorHex, remainingG, totalG }: FilamentGraduatedGaugeProps) {
  const total = totalG > 0 ? totalG : 1000;
  const fillPercent = Math.max(0, Math.min(100, (remainingG / total) * 100));

  return (
    <div className="relative" style={{ height: CYLINDER_HEIGHT, width: CYLINDER_WIDTH + LABEL_GAP + LABEL_WIDTH }}>
      <div
        className="absolute left-0 top-0 overflow-hidden rounded-b-2xl rounded-t-md border border-white/10 bg-white/[0.03]"
        style={{ width: CYLINDER_WIDTH, height: CYLINDER_HEIGHT }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-500 ease-out"
          style={{ height: `${fillPercent}%`, backgroundColor: colorHex, opacity: 0.85 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
      </div>

      <div
        className="absolute left-0 flex items-center transition-[bottom] duration-500 ease-out"
        style={{ bottom: `${fillPercent}%`, transform: "translateY(50%)" }}
      >
        <span
          className="h-px shrink-0 bg-neon-pink shadow-[0_0_6px_rgba(255,78,223,0.8)]"
          style={{ width: CYLINDER_WIDTH }}
        />
        <span className="pl-1.5 text-[9px] font-numeric font-medium leading-none text-neon-pink">{remainingG}g</span>
      </div>
    </div>
  );
}
