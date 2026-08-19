export interface CalcBed {
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  /** Preço/kg específico dessa mesa (filamento próprio) — sobrepõe o `filamentPricePerKg` do input quando presente. */
  filamentPricePerKg?: number;
}

export interface CalcInput {
  beds: CalcBed[];
  /** Preço/kg padrão usado por mesas sem `filamentPricePerKg` próprio. */
  filamentPricePerKg?: number;
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
  const defaultFilamentPricePerKg = input.filamentPricePerKg ?? 0;

  const totalWeightG = beds.reduce((sum, b) => sum + (b.weightG || 0), 0);
  const totalHours = beds.reduce((sum, b) => sum + (b.timeH || 0) + (b.timeM || 0) / 60, 0);
  const energyCost = beds.reduce((sum, b) => {
    const hours = (b.timeH || 0) + (b.timeM || 0) / 60;
    return sum + (b.watts / 1000) * hours * kwhRate;
  }, 0);
  // Cada mesa pode ter seu proprio filamento (produtos multicoloridos) — soma
  // o custo mesa a mesa em vez de aplicar um preço/kg único sobre o peso total.
  const filamentCost = beds.reduce((sum, b) => {
    const pricePerKg = b.filamentPricePerKg ?? defaultFilamentPricePerKg;
    return sum + ((b.weightG || 0) / 1000) * pricePerKg;
  }, 0);
  const laborCost = laborHours * hourlyRate;
  const paint = paintedByHand ? paintCost : 0;

  const baseCost = filamentCost + energyCost + laborCost + extras + paint + suppliesCost;
  // Margem sobre o preço de venda (não markup sobre custo): só é válida abaixo de 100%,
  // já que nesse ponto o preço tenderia ao infinito — a UI restringe a faixa (0-99%) via slider.
  const clampedMargin = Math.min(Math.max(marginPercent, 0), 99);
  const priceWithMargin = baseCost / (1 - clampedMargin / 100);
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
