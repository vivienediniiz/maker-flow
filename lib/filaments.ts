import type { Filament, FilamentMovementType } from "./types";

const DEFAULT_LOW_STOCK_WEIGHT_G = 150;
const DEFAULT_LOW_STOCK_PERCENT = 15;

export function filamentFillPercent(f: Pick<Filament, "remaining_weight_g" | "weight_total_g">) {
  const total = f.weight_total_g > 0 ? f.weight_total_g : 1000;
  return Math.min(100, (f.remaining_weight_g / total) * 100);
}

/** Usa low_stock_threshold_g quando configurado na linha; senão cai no padrão do app (150g ou 15%). */
export function isFilamentLow(
  f: Pick<Filament, "remaining_weight_g" | "weight_total_g" | "low_stock_threshold_g">
) {
  if (f.low_stock_threshold_g != null) return f.remaining_weight_g < f.low_stock_threshold_g;
  return f.remaining_weight_g < DEFAULT_LOW_STOCK_WEIGHT_G || filamentFillPercent(f) < DEFAULT_LOW_STOCK_PERCENT;
}

export function filamentLabel(f: Pick<Filament, "brand" | "material">) {
  return `${f.material} — ${f.brand}`;
}

export const FILAMENT_MOVEMENT_TYPE_LABELS: Record<FilamentMovementType, string> = {
  purchase: "Compra",
  sale_consumption: "Consumo em venda",
  manual_adjustment: "Ajuste manual",
};
