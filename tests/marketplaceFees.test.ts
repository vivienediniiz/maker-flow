import { describe, expect, it } from "vitest";
import { describeMarketplaceFee, parseMarketplaceFees, serializeMarketplaceFees } from "@/lib/marketplaceFees";

describe("parseMarketplaceFees", () => {
  it("lê o formato antigo (só o percentual) e o novo ({ percent, fixed }) juntos", () => {
    expect(parseMarketplaceFees({ ML: 14, Shopee: { percent: 20, fixed: 4.5 }, Própria: 0 })).toEqual([
      { name: "ML", fee: 14, fixed: 0 },
      { name: "Shopee", fee: 20, fixed: 4.5 },
      { name: "Própria", fee: 0, fixed: 0 },
    ]);
  });

  it("valores inválidos, negativos ou ausentes viram zero", () => {
    expect(parseMarketplaceFees({ A: "x" as unknown as number, B: { percent: -3, fixed: -1 }, C: { percent: 10 } })).toEqual([
      { name: "A", fee: 0, fixed: 0 },
      { name: "B", fee: 0, fixed: 0 },
      { name: "C", fee: 10, fixed: 0 },
    ]);
    expect(parseMarketplaceFees(null)).toEqual([]);
  });
});

describe("serializeMarketplaceFees", () => {
  it("só vira objeto quando há taxa fixa — sem ela, mantém o formato antigo", () => {
    expect(
      serializeMarketplaceFees([
        { name: "ML", fee: 14, fixed: 0 },
        { name: "Shopee", fee: 20, fixed: 4.5 },
      ])
    ).toEqual({ ML: 14, Shopee: { percent: 20, fixed: 4.5 } });
  });

  it("ida e volta preserva os dados", () => {
    const rows = [
      { name: "Shopee", fee: 20, fixed: 4.5 },
      { name: "Loja", fee: 0, fixed: 0 },
    ];
    expect(parseMarketplaceFees(serializeMarketplaceFees(rows))).toEqual(rows);
  });
});

describe("describeMarketplaceFee", () => {
  it.each([
    [20, 4.5, "20% + R$ 4,50"],
    [14, 0, "14%"],
    [0, 4, "R$ 4,00"],
    [0, 0, "sem taxa"],
  ])("%s%% + R$ %s -> %s", (fee, fixed, expected) => {
    expect(describeMarketplaceFee(fee, fixed)).toBe(expected);
  });
});
