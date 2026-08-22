export interface CalcBed {
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  /** Preço/kg específico dessa mesa (filamento próprio) — sobrepõe o `filamentPricePerKg` do input quando presente. */
  filamentPricePerKg?: number;
  /** Margem de segurança (%) pra falhas de impressão — infla peso/tempo só no cálculo de filamento/energia desta mesa, sem alterar `weightG`/`timeH`/`timeM` (que continuam representando o valor real digitado). */
  safetyMarginPercent?: number;
}

export interface CalcInput {
  beds: CalcBed[];
  /** Preço/kg padrão usado por mesas sem `filamentPricePerKg` próprio. */
  filamentPricePerKg?: number;
  kwhRate: number;
  /** Fixos por pedido — não multiplicam pela quantidade de produtos finais. */
  laborHours: number;
  hourlyRate: number;
  extras: number;
  paintedByHand: boolean;
  paintCost: number;
  /** Soma do custo de insumos (supplies) por UNIDADE — multiplica por `quantity`. Opcional — default 0. */
  suppliesCost?: number;
  marketplaceFee: number;
  marginPercent: number;
  /** Quantidade de Produtos Finais do pedido — multiplica custo/preço por unidade (mesas + insumos), nunca os fixos. */
  quantity: number;
}

export interface CalcResult {
  totalWeightG: number;
  totalHours: number;
  energyCost: number;
  filamentCost: number;
  /** Custo de Impressão por Unidade = filamentCost + energyCost — soma de TODAS as mesas, já representa 1 unidade completa. */
  printCost: number;
  /** Custo de Insumos por Unidade. */
  suppliesCost: number;
  /** Custo Total por Unidade = printCost + suppliesCost. */
  costPerUnit: number;
  /** Fixos por pedido (não multiplicam pela quantidade). */
  laborCost: number;
  paint: number;
  fixedCosts: number;
  /** Preço de Venda Sugerido por Unidade (margem + taxa de marketplace aplicadas sobre costPerUnit). */
  pricePerUnit: number;
  /** Custo Total do Pedido = costPerUnit × quantity + fixedCosts. */
  orderCost: number;
  /** Valor Total do Pedido = pricePerUnit × quantity + fixedCosts. */
  orderPrice: number;
}

/**
 * Fórmula de custo/preço usada pela Calculadora Inteligente — extraída pra cá
 * pra ser a única fonte de verdade, reaproveitada também no cálculo de custo
 * unitário embutido no cadastro de produto (que sempre chama com quantity=1,
 * então orderCost/orderPrice colapsam pro mesmo valor de costPerUnit/pricePerUnit).
 *
 * Duas camadas que não se misturam: tudo que é POR UNIDADE (filamento,
 * energia, insumos) multiplica pela quantidade; tudo que é FIXO por pedido
 * (mão de obra, pintura, extras) soma uma vez só, sem markup de margem.
 */
export function calculateCost(input: CalcInput): CalcResult {
  const { beds, kwhRate, laborHours, hourlyRate, extras, paintedByHand, paintCost, marketplaceFee, marginPercent, quantity } = input;
  const suppliesCost = input.suppliesCost ?? 0;
  const defaultFilamentPricePerKg = input.filamentPricePerKg ?? 0;

  // Totais exibidos/salvos continuam com o valor REAL digitado — a margem de
  // segurança não infla peso/tempo aqui, só entra no cálculo de custo abaixo.
  const totalWeightG = beds.reduce((sum, b) => sum + (b.weightG || 0), 0);
  const totalHours = beds.reduce((sum, b) => sum + (b.timeH || 0) + (b.timeM || 0) / 60, 0);

  const energyCost = beds.reduce((sum, b) => {
    const marginMult = 1 + (b.safetyMarginPercent || 0) / 100;
    const hours = ((b.timeH || 0) + (b.timeM || 0) / 60) * marginMult;
    return sum + (b.watts / 1000) * hours * kwhRate;
  }, 0);
  // Cada mesa pode ter seu proprio filamento (produtos multicoloridos) — soma
  // o custo mesa a mesa em vez de aplicar um preço/kg único sobre o peso total.
  const filamentCost = beds.reduce((sum, b) => {
    const marginMult = 1 + (b.safetyMarginPercent || 0) / 100;
    const pricePerKg = b.filamentPricePerKg ?? defaultFilamentPricePerKg;
    return sum + (((b.weightG || 0) * marginMult) / 1000) * pricePerKg;
  }, 0);

  const printCost = filamentCost + energyCost;
  const costPerUnit = printCost + suppliesCost;

  const laborCost = laborHours * hourlyRate;
  const paint = paintedByHand ? paintCost : 0;
  const fixedCosts = laborCost + paint + extras;

  // Margem sobre o preço de venda (não markup sobre custo): só é válida abaixo de 100%,
  // já que nesse ponto o preço tenderia ao infinito — a UI restringe a faixa (0-99%) via slider.
  const clampedMargin = Math.min(Math.max(marginPercent, 0), 99);
  const priceWithMargin = costPerUnit / (1 - clampedMargin / 100);
  const pricePerUnit = marketplaceFee > 0 ? priceWithMargin / (1 - marketplaceFee / 100) : priceWithMargin;

  const qty = Math.max(quantity, 1);
  const orderCost = costPerUnit * qty + fixedCosts;
  const orderPrice = pricePerUnit * qty + fixedCosts;

  return {
    totalWeightG,
    totalHours,
    energyCost,
    filamentCost,
    printCost,
    suppliesCost,
    costPerUnit,
    laborCost,
    paint,
    fixedCosts,
    pricePerUnit,
    orderCost,
    orderPrice,
  };
}
