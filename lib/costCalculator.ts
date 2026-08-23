export interface CalcMixedItem {
  id: string;
  description: string;
  /** Peso de UMA unidade deste item (g) — multiplica por `quantity` pra ratear o custo da mesa. */
  weightG: number;
  quantity: number;
}

export interface CalcBed {
  /** Opcional — só pra `calculateCost` devolver o nome da mesa no breakdown do Modelo C. */
  name?: string;
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  /** Preço/kg específico dessa mesa (filamento próprio) — sobrepõe o `filamentPricePerKg` do input quando presente. */
  filamentPricePerKg?: number;
  /** Margem de segurança (%) pra falhas de impressão — infla peso/tempo só no cálculo de filamento/energia desta mesa, sem alterar `weightG`/`timeH`/`timeM` (que continuam representando o valor real digitado). */
  safetyMarginPercent?: number;
  /**
   * "A" = lote de peças idênticas nesta mesa (custo dividido por `piecesInBed`);
   * "B" = peça única/montagem, mesa inteira conta como 1 contribuição (padrão);
   * "C" = mix de peças diferentes, custo rateado por peso entre `mixedItems`, fora do custo por unidade do produto principal.
   * Ausente = "B", preservando o comportamento de registros salvos antes desse campo existir.
   */
  modelType?: "A" | "B" | "C";
  /** Só usado quando `modelType === "A"` — divide o custo desta mesa por esse número de peças idênticas. */
  piecesInBed?: number;
  /** Só usado quando `modelType === "C"`. */
  mixedItems?: CalcMixedItem[];
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
  /** % extra da faixa de risco operacional selecionada (opcional) — aplicado sobre o preço já com margem+taxa de marketplace, não sobre o custo. */
  riskMarginPercent?: number;
  /** Quantidade de Produtos Finais do pedido — multiplica custo/preço por unidade (mesas + insumos), nunca os fixos. */
  quantity: number;
}

export interface CalcMixedItemResult extends CalcMixedItem {
  itemTotalCost: number;
  itemUnitCost: number;
}

export interface CalcMixedBedBreakdown {
  bedName?: string;
  totalBedCost: number;
  totalItemsWeight: number;
  items: CalcMixedItemResult[];
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
  /** Preço com margem + taxa de marketplace, ANTES do acréscimo de risco — só pra exibir a comparação no resumo. */
  pricePerUnitBeforeRisk: number;
  /** Preço de Venda Sugerido por Unidade — inclui o acréscimo de risco quando uma faixa é selecionada. É esse valor que flui pra Criar Pedido/PDF/Link de Cobrança. */
  pricePerUnit: number;
  /** Custo Total do Pedido = costPerUnit × quantity + fixedCosts. */
  orderCost: number;
  /** Valor Total do Pedido = pricePerUnit × quantity + fixedCosts. */
  orderPrice: number;
  /** Mesas Modelo C (mix de peças diferentes) — ficam FORA do custo por unidade acima; rateio informativo por item, na mesma ordem das mesas `C` do input. */
  mixedBreakdowns: CalcMixedBedBreakdown[];
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
  const riskMarginPercent = Math.max(input.riskMarginPercent ?? 0, 0);
  const defaultFilamentPricePerKg = input.filamentPricePerKg ?? 0;

  // Totais exibidos/salvos continuam com o valor REAL digitado, somando TODAS
  // as mesas (inclusive Mix) — a margem de segurança não infla peso/tempo
  // aqui, só entra no cálculo de custo abaixo.
  const totalWeightG = beds.reduce((sum, b) => sum + (b.weightG || 0), 0);
  const totalHours = beds.reduce((sum, b) => sum + (b.timeH || 0) + (b.timeM || 0) / 60, 0);

  // Mesas Modelo C (mix de peças diferentes) não representam "1 unidade" do
  // produto principal — ficam fora do custo por unidade, viram só o rateio
  // informativo em `mixedBreakdowns` mais abaixo.
  const unitBeds = beds.filter((b) => b.modelType !== "C");
  const mixedBeds = beds.filter((b) => b.modelType === "C");

  // Modelo A divide o custo desta mesa pelo nº de peças idênticas; Modelo B
  // (ou modelType ausente) usa `pieces = 1`, ou seja, comportamento idêntico
  // ao de antes desse campo existir.
  function piecesOf(b: CalcBed): number {
    return b.modelType === "A" ? Math.max(b.piecesInBed || 1, 1) : 1;
  }

  const energyCost = unitBeds.reduce((sum, b) => {
    const marginMult = 1 + (b.safetyMarginPercent || 0) / 100;
    const hours = ((b.timeH || 0) + (b.timeM || 0) / 60) * marginMult;
    return sum + ((b.watts / 1000) * hours * kwhRate) / piecesOf(b);
  }, 0);
  // Cada mesa pode ter seu proprio filamento (produtos multicoloridos) — soma
  // o custo mesa a mesa em vez de aplicar um preço/kg único sobre o peso total.
  const filamentCost = unitBeds.reduce((sum, b) => {
    const marginMult = 1 + (b.safetyMarginPercent || 0) / 100;
    const pricePerKg = b.filamentPricePerKg ?? defaultFilamentPricePerKg;
    return sum + ((((b.weightG || 0) * marginMult) / 1000) * pricePerKg) / piecesOf(b);
  }, 0);

  const printCost = filamentCost + energyCost;
  const costPerUnit = printCost + suppliesCost;

  // Rateio do custo de cada mesa Mix entre os itens diferentes que ela
  // imprime junto, proporcional ao peso de cada item — não entra em
  // costPerUnit/printCost acima, é só referência pra cadastrar cada item.
  const mixedBreakdowns: CalcMixedBedBreakdown[] = mixedBeds.map((b) => {
    const marginMult = 1 + (b.safetyMarginPercent || 0) / 100;
    const pricePerKg = b.filamentPricePerKg ?? defaultFilamentPricePerKg;
    const bedFilamentCost = (((b.weightG || 0) * marginMult) / 1000) * pricePerKg;
    const bedHours = ((b.timeH || 0) + (b.timeM || 0) / 60) * marginMult;
    const bedEnergyCost = (b.watts / 1000) * bedHours * kwhRate;
    const totalBedCost = bedFilamentCost + bedEnergyCost;

    const items = b.mixedItems ?? [];
    const totalItemsWeight = items.reduce((s, i) => s + (i.weightG || 0) * (i.quantity || 0), 0);
    const itemResults: CalcMixedItemResult[] = items.map((i) => {
      const ratio = totalItemsWeight > 0 ? ((i.weightG || 0) * (i.quantity || 0)) / totalItemsWeight : 0;
      const itemTotalCost = totalBedCost * ratio;
      return { ...i, itemTotalCost, itemUnitCost: i.quantity > 0 ? itemTotalCost / i.quantity : 0 };
    });

    return { bedName: b.name, totalBedCost, totalItemsWeight, items: itemResults };
  });

  const laborCost = laborHours * hourlyRate;
  const paint = paintedByHand ? paintCost : 0;
  const fixedCosts = laborCost + paint + extras;

  // Margem sobre o preço de venda (não markup sobre custo): só é válida abaixo de 100%,
  // já que nesse ponto o preço tenderia ao infinito — a UI restringe a faixa (0-99%) via slider.
  const clampedMargin = Math.min(Math.max(marginPercent, 0), 99);
  const priceWithMargin = costPerUnit / (1 - clampedMargin / 100);
  // Mesma proteção da margem: taxa >= 100% faz o preço virar Infinity/negativo.
  const clampedFee = Math.min(Math.max(marketplaceFee, 0), 99);
  const pricePerUnitBeforeRisk = clampedFee > 0 ? priceWithMargin / (1 - clampedFee / 100) : priceWithMargin;
  const pricePerUnit = pricePerUnitBeforeRisk * (1 + riskMarginPercent / 100);

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
    pricePerUnitBeforeRisk,
    pricePerUnit,
    orderCost,
    orderPrice,
    mixedBreakdowns,
  };
}
