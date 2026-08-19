import { cn } from "@/lib/utils";

interface FilamentLevelBarProps {
  remainingG: number;
  totalG: number;
  colorHex: string;
  isLow?: boolean;
}

/** 100g pra rolos de ate 1kg, 200g pra rolos maiores — mantem a barra legivel sem marcações demais. */
function tickInterval(totalG: number) {
  return totalG <= 1000 ? 100 : 200;
}

export function FilamentLevelBar({ remainingG, totalG, colorHex, isLow = false }: FilamentLevelBarProps) {
  const total = totalG > 0 ? totalG : 1000;
  const fillPercent = Math.max(0, Math.min(100, (remainingG / total) * 100));
  const interval = tickInterval(total);
  const ticks: number[] = [];
  for (let v = interval; v < total; v += interval) ticks.push(v);

  return (
    <div className="space-y-1.5">
      <div className="relative h-3 w-full overflow-hidden rounded-pill bg-white/5">
        <div
          className="h-full rounded-pill transition-all"
          style={{ width: `${fillPercent}%`, backgroundColor: isLow ? "#FF4E4E" : colorHex }}
        />
        {ticks.map((t) => (
          <span key={t} className="absolute top-0 h-full w-px bg-black/30" style={{ left: `${(t / total) * 100}%` }} />
        ))}
      </div>
      <p className={cn("text-xs", isLow ? "font-medium text-red-400" : "text-text-secondary")}>
        {remainingG}g / {total}g
      </p>
    </div>
  );
}
