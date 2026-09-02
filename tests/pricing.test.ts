import { afterEach, describe, expect, it, vi } from "vitest";
import { computeCouponDiscount, getCouponStatusLabel, isCouponValid } from "@/lib/coupons";
import { buildPriceTierRanges } from "@/lib/priceTiers";
import { formatBRL } from "@/lib/utils";
import type { Coupon } from "@/lib/types";

const HOJE = "2026-08-30";
const ONTEM = "2026-08-29";
const AMANHA = "2026-08-31";

function freezeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${HOJE}T12:00:00.000Z`));
}

afterEach(() => {
  vi.useRealTimers();
});

/** Cupom válido de 10% sem nenhuma restrição — cada teste aperta um parafuso. */
function coupon(over: Partial<Coupon> = {}): Coupon {
  return {
    id: "c1",
    user_id: "u1",
    code: "MAKER10",
    campaign_name: null,
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: null,
    usage_limit: null,
    times_used: 0,
    valid_until: null,
    active: true,
    created_at: `${HOJE}T00:00:00.000Z`,
    ...over,
  };
}

describe("validade do cupom", () => {
  it("aceita o cupom sem restrição nenhuma", () => {
    freezeClock();
    expect(isCouponValid(coupon(), 100)).toBe(true);
  });

  it("recusa cupom desligado", () => {
    freezeClock();
    expect(isCouponValid(coupon({ active: false }), 100)).toBe(false);
  });

  it("recusa cupom vencido, mas aceita no último dia de validade", () => {
    freezeClock();
    expect(isCouponValid(coupon({ valid_until: ONTEM }), 100)).toBe(false);
    expect(isCouponValid(coupon({ valid_until: HOJE }), 100)).toBe(true);
    expect(isCouponValid(coupon({ valid_until: AMANHA }), 100)).toBe(true);
  });

  it("recusa cupom que já bateu o limite de usos", () => {
    freezeClock();
    expect(isCouponValid(coupon({ usage_limit: 10, times_used: 10 }), 100)).toBe(false);
    expect(isCouponValid(coupon({ usage_limit: 10, times_used: 9 }), 100)).toBe(true);
  });

  it("sem limite de usos, a contagem não trava o cupom", () => {
    freezeClock();
    expect(isCouponValid(coupon({ usage_limit: null, times_used: 999 }), 100)).toBe(true);
  });

  it("respeita o valor mínimo do pedido, e o pedido exato no mínimo passa", () => {
    freezeClock();
    expect(isCouponValid(coupon({ min_order_value: 200 }), 199.99)).toBe(false);
    expect(isCouponValid(coupon({ min_order_value: 200 }), 200)).toBe(true);
  });
});

describe("rótulo de status do cupom", () => {
  it("mostra Inativo antes de qualquer outro motivo", () => {
    freezeClock();
    expect(getCouponStatusLabel(coupon({ active: false, valid_until: ONTEM, usage_limit: 1, times_used: 5 }))).toBe(
      "Inativo"
    );
  });

  it("mostra Expirado antes de Esgotado quando os dois valem", () => {
    freezeClock();
    expect(getCouponStatusLabel(coupon({ valid_until: ONTEM, usage_limit: 1, times_used: 5 }))).toBe("Expirado");
  });

  it("mostra Esgotado quando só o limite de usos acabou", () => {
    freezeClock();
    expect(getCouponStatusLabel(coupon({ usage_limit: 3, times_used: 3 }))).toBe("Esgotado");
  });

  it("mostra Ativo quando nada barra o cupom", () => {
    freezeClock();
    expect(getCouponStatusLabel(coupon({ valid_until: AMANHA, usage_limit: 3, times_used: 1 }))).toBe("Ativo");
  });

  it("o rótulo concorda com a validade — nada aparece Ativo e é recusado", () => {
    freezeClock();
    const casos = [
      coupon({ active: false }),
      coupon({ valid_until: ONTEM }),
      coupon({ usage_limit: 1, times_used: 1 }),
      coupon({ valid_until: AMANHA }),
    ];
    for (const c of casos) {
      expect(getCouponStatusLabel(c) === "Ativo").toBe(isCouponValid(c, 1000));
    }
  });
});

describe("cálculo do desconto", () => {
  it("desconto percentual sai sobre o valor do pedido", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "percentage", discount_value: 10 }), 250)).toBeCloseTo(25);
  });

  it("desconto fixo sai pelo valor cadastrado", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "fixed", discount_value: 50 }), 250)).toBe(50);
  });

  it("desconto fixo maior que o pedido não zera nem deixa o total negativo", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "fixed", discount_value: 500 }), 200)).toBe(200);
  });

  it("percentual acima de 100 também para no valor do pedido", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "percentage", discount_value: 150 }), 200)).toBe(200);
  });

  it("desconto negativo não vira acréscimo", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "fixed", discount_value: -30 }), 200)).toBe(0);
  });

  it("pedido zerado não gera desconto", () => {
    expect(computeCouponDiscount(coupon({ discount_type: "percentage", discount_value: 10 }), 0)).toBe(0);
  });
});

describe("faixas de preço por quantidade", () => {
  it("ordena as faixas mesmo cadastradas fora de ordem", () => {
    const faixas = buildPriceTierRanges([
      { quantity: 50, price: 9.5 },
      { quantity: 1, price: 15 },
      { quantity: 10, price: 12 },
    ]);
    expect(faixas.map((f) => f.quantity)).toEqual([1, 10, 50]);
  });

  it("fecha cada faixa uma unidade antes da próxima, e deixa a última aberta", () => {
    const faixas = buildPriceTierRanges([
      { quantity: 1, price: 15 },
      { quantity: 10, price: 12 },
      { quantity: 50, price: 9.5 },
    ]);
    expect(faixas[0].label).toBe(`1-9 un — ${formatBRL(15)}/un`);
    expect(faixas[1].label).toBe(`10-49 un — ${formatBRL(12)}/un`);
    expect(faixas[2].label).toBe(`50+ un — ${formatBRL(9.5)}/un`);
  });

  it("guarda o índice original para a edição não apontar pra faixa errada", () => {
    const faixas = buildPriceTierRanges([
      { quantity: 50, price: 9.5 },
      { quantity: 1, price: 15 },
    ]);
    expect(faixas[0]).toMatchObject({ quantity: 1, originalIndex: 1 });
    expect(faixas[1]).toMatchObject({ quantity: 50, originalIndex: 0 });
  });

  it("faixa única fica aberta", () => {
    const [faixa] = buildPriceTierRanges([{ quantity: 1, price: 15 }]);
    expect(faixa.label).toBe(`1+ un — ${formatBRL(15)}/un`);
  });

  it("lista vazia não quebra a tela de produto", () => {
    expect(buildPriceTierRanges([])).toEqual([]);
  });

  it("não altera a lista recebida", () => {
    const original = [
      { quantity: 50, price: 9.5 },
      { quantity: 1, price: 15 },
    ];
    buildPriceTierRanges(original);
    expect(original.map((t) => t.quantity)).toEqual([50, 1]);
  });
});
