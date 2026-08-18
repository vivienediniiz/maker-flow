export interface CalcBed {
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
}

export interface CalcInput {
  beds: CalcBed[];
  filamentPricePerKg: number;
  kwhRate: number;
  laborHours: number;
  hourlyRate: number;
  extras: number;
  paintedByHand: boolean;
  paintCost: number;
  /** Soma do custo de insumos (supplies) usados na peça. Opcional — default 0. */
  suppliesCost?: number;
  marketplaceFee: number;
  marginPercent: number;
  quantity: number;
}

export interface CalcResult {
  totalWeightG: number;
  totalHours: number;
  energyCost: number;
  filamentCost: number;
  laborCost: number;
  paint: number;
  suppliesCost: number;
  baseCost: number;
  finalPrice: number;
  pricePerPiece: number;
}

/**
 * Fórmula de custo/preço usada pela Calculadora Inteligente — extraída pra cá
 * pra ser a única fonte de verdade, reaproveitada também no cálculo de custo
 * unitário embutido no cadastro de produto.
 */
export function calculateCost(input: CalcInput): CalcResult {
  const {
    beds,
    filamentPricePerKg,
    kwhRate,
    laborHours,
    hourlyRate,
    extras,
    paintedByHand,
    paintCost,
    marketplaceFee,
    marginPercent,
    quantity,
  } = input;
  const suppliesCost = input.suppliesCost ?? 0;

  const totalWeightG = beds.reduce((sum, b) => sum + (b.weightG || 0), 0);
  const totalHours = beds.reduce((sum, b) => sum + (b.timeH || 0) + (b.timeM || 0) / 60, 0);
  const energyCost = beds.reduce((sum, b) => {
    const hours = (b.timeH || 0) + (b.timeM || 0) / 60;
    return sum + (b.watts / 1000) * hours * kwhRate;
  }, 0);
  const filamentCost = (totalWeightG / 1000) * filamentPricePerKg;
  const laborCost = laborHours * hourlyRate;
  const paint = paintedByHand ? paintCost : 0;

  const baseCost = filamentCost + energyCost + laborCost + extras + paint + suppliesCost;
  const priceWithMargin = baseCost * (1 + marginPercent / 100);
  const finalPrice = marketplaceFee > 0 ? priceWithMargin / (1 - marketplaceFee / 100) : priceWithMargin;
  const pricePerPiece = finalPrice / Math.max(quantity, 1);

  return {
    totalWeightG,
    totalHours,
    energyCost,
    filamentCost,
    laborCost,
    paint,
    suppliesCost,
    baseCost,
    finalPrice,
    pricePerPiece,
  };
}
