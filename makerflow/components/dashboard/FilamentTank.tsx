import { cn } from "@/lib/utils";
import { filamentFillPercent, isFilamentLow } from "@/lib/filaments";
import { FilamentVerticalGauge } from "@/components/dashboard/FilamentVerticalGauge";
import type { Filament } from "@/lib/types";

export function FilamentTank({ filament }: { filament: Filament }) {
  const fillPercent = filamentFillPercent(filament);
  const isLow = isFilamentLow(filament);

  return (
    <div className="glass-card flex flex-col items-center gap-3 p-4">
      <FilamentVerticalGauge colorHex={filament.color_hex} fillPercent={fillPercent} size="md" />
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
