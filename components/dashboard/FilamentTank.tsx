import { cn } from "@/lib/utils";
import type { Filament } from "@/lib/types";

export function FilamentTank({ filament }: { filament: Filament }) {
  const fillPercent = Math.min(100, (filament.remaining_weight_g / 1000) * 100);
  const isLow = fillPercent < 20;

  return (
    <div className="glass-card flex flex-col items-center gap-3 p-4">
      <div className="relative h-32 w-16 overflow-hidden rounded-b-2xl rounded-t-md border border-white/10 bg-white/[0.03]">
        <div
          className="absolute bottom-0 left-0 right-0 transition-all"
          style={{ height: `${fillPercent}%`, backgroundColor: filament.color_hex, opacity: 0.85 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-text-primary">{filament.brand}</p>
        <p className="text-[10px] text-text-muted">{filament.material}</p>
        <p className={cn("text-[10px] font-medium", isLow ? "text-red-400" : "text-text-secondary")}>
          {filament.remaining_weight_g}g {isLow && "· estoque baixo"}
        </p>
      </div>
    </div>
  );
}
