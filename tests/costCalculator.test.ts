import { describe, expect, it } from "vitest";
import { bedCostBreakdown, calculateCost, type CalcBed, type CalcInput } from "@/lib/costCalculator";

/** Mesa de referência: 1kg de filamento, 10h de impressão, 200W. */
const BED: CalcBed = { weightG: 1000, timeH: 10, timeM: 0, watts: 200 };

/**
 * Entrada de referência — custo por unidade de R$ 110 (100 de filamento,
 * 2 de energia, 8 de insumos) e R$ 120 de fixos (100 de mão de obra + 20 de
 * extras). Os testes sobrescrevem só o campo que estão exercitando.
 */
function input(over: Partial<CalcInput> = {}): CalcInput {
  return {
    beds: [BED],
    filamentPricePerKg: 100,
    kwhRate: 1,
    laborHours: 2,
    hourlyRate: 50,
    extras: 20,
    paintedByHand: false,
    paintCost: 30,
    suppliesCost: 8,
    marketplaceFee: 0,
    marginPercent: 50,
    quantity: 3,
    ...over,
  };
}

describe("bedCostBreakdown", () => {
  it("cobra o filamento por peso e a energia por watt-hora", () => {
    const { filamentCost, energyCost, totalCost } = bedCostBreakdown(BED, 1, 100);
    expect(filamentCost).toBeCloseTo(100);
    expect(energyCost).toBeCloseTo(2);
    expect(totalCost).toBeCloseTo(102);
  });

  it("soma os minutos às horas em vez de ignorá-los", () => {
    const { energyCost } = bedCostBreakdown({ ...BED, timeH: 0, timeM: 30 }, 1, 100);
    expect(energyCost).toBeCloseTo(0.1);
  });

  it("a margem de segurança infla filamento e energia juntos", () => {
    const { filamentCost, energyCost } = bedCostBreakdown({ ...BED, safetyMarginPercent: 10 }, 1, 100);
    expect(filamentCost).toBeCloseTo(110);
    expect(energyCost).toBeCloseTo(2.2);
  });

  it("o preço/kg da própria mesa vence o preço padrão — filamento multicolorido", () => {
    const { filamentCost } = bedCostBreakdown({ ...BED, filamentPricePerKg: 50 }, 1, 100);
    expect(filamentCost).toBeCloseTo(50);
  });

  it("preço/kg zero na mesa não cai de volta no padrão", () => {
    const { filamentCost } = bedCostBreakdown({ ...BED, filamentPricePerKg: 0 }, 1, 100);
    expect(filamentCost).toBe(0);
  });
});

describe("custo por unidade", () => {
  it("soma filamento, energia e insumos — e nada mais", () => {
    const r = calculateCost(input());
    expect(r.filamentCost).toBeCloseTo(100);
    expect(r.energyCost).toBeCloseTo(2);
    expect(r.printCost).toBeCloseTo(102);
    expect(r.suppliesCost).toBe(8);
    expect(r.costPerUnit).toBeCloseTo(110);
  });

  it("insumos ausentes valem zero, não NaN", () => {
    const r = calculateCost(input({ suppliesCost: undefined }));
    expect(r.suppliesCost).toBe(0);
    expect(r.costPerUnit).toBeCloseTo(102);
  });

  it("mesas Modelo A e B custam igual — nenhum modelo divide por número de peças", () => {
    const a = calculateCost(input({ beds: [{ ...BED, modelType: "A" }] }));
    const b = calculateCost(input({ beds: [{ ...BED, modelType: "B" }] }));
    const legado = calculateCost(input({ beds: [{ ...BED, piecesInBed: 12 }] }));
    expect(a.costPerUnit).toBeCloseTo(b.costPerUnit);
    expect(legado.costPerUnit).toBeCloseTo(b.costPerUnit);
  });

  it("várias mesas somam uma unidade completa, cada uma com seu filamento", () => {
    const r = calculateCost(
      input({
        beds: [
          { ...BED, filamentPricePerKg: 100 },
          { ...BED, weightG: 500, timeH: 5, filamentPricePerKg: 200 },
        ],
      })
    );
    expect(r.filamentCost).toBeCloseTo(200);
    expect(r.energyCost).toBeCloseTo(3);
    expect(r.totalWeightG).toBe(1500);
    expect(r.totalHours).toBeCloseTo(15);
  });

  it("os totais exibidos usam o valor real digitado, sem a margem de segurança", () => {
    const r = calculateCost(input({ beds: [{ ...BED, safetyMarginPercent: 50 }] }));
    expect(r.totalWeightG).toBe(1000);
    expect(r.totalHours).toBeCloseTo(10);
    expect(r.filamentCost).toBeCloseTo(150);
  });
});

describe("custos fixos do pedido", () => {
  it("mão de obra, pintura e extras entram uma vez só", () => {
    const r = calculateCost(input({ paintedByHand: true }));
    expect(r.laborCost).toBeCloseTo(100);
    expect(r.paint).toBe(30);
    expect(r.fixedCosts).toBeCloseTo(150);
  });

  it("sem pintura à mão o custo de tinta é ignorado, mesmo preenchido", () => {
    const r = calculateCost(input({ paintedByHand: false, paintCost: 30 }));
    expect(r.paint).toBe(0);
  });

  it("dobrar a quantidade acrescenta só o custo por unidade, nunca os fixos", () => {
    const um = calculateCost(input({ quantity: 1 }));
    const dois = calculateCost(input({ quantity: 2 }));
    expect(dois.orderCost - um.orderCost).toBeCloseTo(um.costPerUnit);
    expect(dois.orderPrice - um.orderPrice).toBeCloseTo(um.pricePerUnit);
    expect(dois.fixedCosts).toBeCloseTo(um.fixedCosts);
  });

  it("quantidade zero ou negativa vale 1 — pedido nunca soma custo nenhum", () => {
    const r = calculateCost(input({ quantity: 0 }));
    expect(r.orderCost).toBeCloseTo(r.costPerUnit + r.fixedCosts);
    expect(calculateCost(input({ quantity: -5 })).orderCost).toBeCloseTo(r.orderCost);
  });
});

describe("margem e taxa de marketplace", () => {
  it("a margem é sobre o preço de venda, não markup sobre o custo", () => {
    const r = calculateCost(input({ marginPercent: 50 }));
    expect(r.pricePerUnit).toBeCloseTo(220);
    // O lucro é exatamente 50% do que entra, que é o que a margem promete.
    expect((r.pricePerUnit - r.costPerUnit) / r.pricePerUnit).toBeCloseTo(0.5);
  });

  it("a taxa de marketplace é descontada do preço final, e sobra a margem cheia", () => {
    const r = calculateCost(input({ marginPercent: 50, marketplaceFee: 20 }));
    expect(r.pricePerUnit).toBeCloseTo(275);
    const liquido = r.pricePerUnit * 0.8;
    expect(liquido).toBeCloseTo(220);
    expect((liquido - r.costPerUnit) / liquido).toBeCloseTo(0.5);
  });

  it("margem de 100% ou mais é travada em 99 — preço alto, nunca infinito", () => {
    const r = calculateCost(input({ marginPercent: 150 }));
    expect(Number.isFinite(r.pricePerUnit)).toBe(true);
    expect(r.pricePerUnit).toBeCloseTo(11000);
  });

  it("margem negativa vira zero — o preço nunca fica abaixo do custo", () => {
    const r = calculateCost(input({ marginPercent: -30 }));
    expect(r.pricePerUnit).toBeCloseTo(r.costPerUnit);
  });

  it("taxa de marketplace de 100% ou mais também é travada em 99", () => {
    const r = calculateCost(input({ marginPercent: 0, marketplaceFee: 120 }));
    expect(Number.isFinite(r.pricePerUnit)).toBe(true);
    expect(r.pricePerUnit).toBeCloseTo(11000);
  });

  it("taxa negativa é ignorada", () => {
    const r = calculateCost(input({ marketplaceFee: -10 }));
    expect(r.pricePerUnit).toBeCloseTo(220);
  });
});

describe("faixa de risco operacional", () => {
  it("o acréscimo de risco entra depois da margem e da taxa", () => {
    const r = calculateCost(input({ marginPercent: 50, riskMarginPercent: 10 }));
    expect(r.pricePerUnitBeforeRisk).toBeCloseTo(220);
    expect(r.pricePerUnit).toBeCloseTo(242);
  });

  it("sem faixa selecionada os dois preços coincidem", () => {
    const r = calculateCost(input());
    expect(r.pricePerUnit).toBeCloseTo(r.pricePerUnitBeforeRisk);
  });

  it("risco negativo não vira desconto", () => {
    const r = calculateCost(input({ riskMarginPercent: -25 }));
    expect(r.pricePerUnit).toBeCloseTo(r.pricePerUnitBeforeRisk);
  });
});

describe("Modelo C — mesa com mix de peças diferentes", () => {
  const mixBed: CalcBed = {
    name: "Mesa mista",
    weightG: 600,
    timeH: 5,
    timeM: 0,
    watts: 200,
    modelType: "C",
    mixedItems: [
      { id: "a", description: "Chaveiro", weightG: 100, quantity: 2 },
      { id: "b", description: "Suporte", weightG: 200, quantity: 2 },
    ],
  };

  it("fica fora do custo por unidade do produto principal", () => {
    const r = calculateCost(input({ beds: [BED, mixBed] }));
    expect(r.costPerUnit).toBeCloseTo(110);
    expect(r.filamentCost).toBeCloseTo(100);
  });

  it("mas continua somando nos totais de peso e tempo exibidos", () => {
    const r = calculateCost(input({ beds: [BED, mixBed] }));
    expect(r.totalWeightG).toBe(1600);
    expect(r.totalHours).toBeCloseTo(15);
  });

  it("rateia o custo da mesa por peso, e o rateio fecha com o total", () => {
    const r = calculateCost(input({ beds: [mixBed] }));
    const [mix] = r.mixedBreakdowns;
    expect(mix.bedName).toBe("Mesa mista");
    expect(mix.totalBedCost).toBeCloseTo(61);
    expect(mix.totalItemsWeight).toBe(600);
    expect(mix.items[0].itemTotalCost).toBeCloseTo(61 / 3);
    expect(mix.items[1].itemTotalCost).toBeCloseTo((61 * 2) / 3);
    const soma = mix.items.reduce((s, i) => s + i.itemTotalCost, 0);
    expect(soma).toBeCloseTo(mix.totalBedCost);
  });

  it("o custo unitário do item divide pelo número de cópias impressas", () => {
    const r = calculateCost(input({ beds: [mixBed] }));
    const [mix] = r.mixedBreakdowns;
    expect(mix.items[0].itemUnitCost).toBeCloseTo(61 / 3 / 2);
    expect(mix.items[1].itemUnitCost).toBeCloseTo(((61 * 2) / 3) / 2);
  });

  it("mesa mista sem itens cadastrados não quebra o cálculo", () => {
    const r = calculateCost(input({ beds: [BED, { ...mixBed, mixedItems: undefined }] }));
    expect(r.mixedBreakdowns[0].items).toEqual([]);
    expect(r.mixedBreakdowns[0].totalBedCost).toBeCloseTo(61);
    expect(r.costPerUnit).toBeCloseTo(110);
  });

  it("item com quantidade zero devolve zero, não NaN nem divisão por zero", () => {
    const r = calculateCost(
      input({ beds: [{ ...mixBed, mixedItems: [{ id: "a", description: "Chaveiro", weightG: 100, quantity: 0 }] }] })
    );
    const [item] = r.mixedBreakdowns[0].items;
    expect(item.itemTotalCost).toBe(0);
    expect(item.itemUnitCost).toBe(0);
  });

  it("um pedido só de mesas mistas tem custo por unidade zero", () => {
    const r = calculateCost(input({ beds: [mixBed], suppliesCost: 0 }));
    expect(r.costPerUnit).toBe(0);
    expect(r.mixedBreakdowns).toHaveLength(1);
  });
});

describe("totais do pedido", () => {
  it("custo e preço do pedido combinam unidade × quantidade mais os fixos", () => {
    const r = calculateCost(input({ quantity: 3 }));
    expect(r.orderCost).toBeCloseTo(110 * 3 + 120);
    expect(r.orderPrice).toBeCloseTo(220 * 3 + 120);
  });

  it("o pedido nunca sai por menos do que custou", () => {
    const r = calculateCost(input({ marginPercent: 0, marketplaceFee: 0 }));
    expect(r.orderPrice).toBeGreaterThanOrEqual(r.orderCost);
  });

  it("pedido vazio devolve zeros, não NaN", () => {
    const r = calculateCost(
      input({ beds: [], suppliesCost: 0, laborHours: 0, extras: 0, paintedByHand: false, quantity: 1 })
    );
    expect(r.costPerUnit).toBe(0);
    expect(r.pricePerUnit).toBe(0);
    expect(r.orderCost).toBe(0);
    expect(r.orderPrice).toBe(0);
    expect(r.totalWeightG).toBe(0);
    expect(r.totalHours).toBe(0);
  });
});
