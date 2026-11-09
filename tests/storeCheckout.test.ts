import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16, normalizePixKey } from "@/lib/pixBrCode";
import {
  allocateCheckoutTotals,
  computeCheckoutTotals,
  listDeliveryChoices,
  parseShippingOptions,
  resolveDelivery,
  trackingStage,
  type StoreDeliveryConfig,
} from "@/lib/storeCheckout";

describe("pix", () => {
  it("CRC16/CCITT-FALSE bate com o vetor padrão", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("monta o BR Code com valor, nome sem acento e CRC válido", () => {
    const payload = buildPixPayload({
      key: "a@b.com",
      holderName: "Ateliê São João",
      city: "Maceió",
      amount: 167.3,
      txid: "PED-1043",
    });
    expect(payload.startsWith("000201010211")).toBe(true);
    expect(payload).toContain("0014br.gov.bcb.pix0107a@b.com");
    expect(payload).toContain("5406167.30");
    expect(payload).toContain("5915ATELIE SAO JOAO");
    expect(payload).toContain("6006MACEIO");
    expect(payload).toContain("62110507PED1043");
    // CRC: recalcular sobre tudo menos os 4 últimos dígitos tem que dar o mesmo valor
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("sem valor, não inclui o campo 54", () => {
    const payload = buildPixPayload({ key: "a@b.com", holderName: "Loja", city: "SP" });
    expect(payload).not.toContain("5406");
    expect(payload).toContain("0503***");
  });

  it("normaliza chaves válidas e recusa o resto", () => {
    expect(normalizePixKey("123.456.789-09")).toBe("12345678909");
    expect(normalizePixKey("12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizePixKey(" Loja@Email.com ")).toBe("loja@email.com");
    expect(normalizePixKey("+5582999990000")).toBe("+5582999990000");
    expect(normalizePixKey("123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(normalizePixKey("abc")).toBeNull();
    expect(normalizePixKey("")).toBeNull();
  });
});

const CONFIG: StoreDeliveryConfig = {
  pickup_enabled: true,
  pickup_address: "Rua A, 10",
  arrange_enabled: true,
  arrange_note: "Motoboy na cidade",
  shipping_options: [{ id: "c1", label: "Correios", price: 22.5, note: "5 a 8 dias" }],
};

describe("entrega", () => {
  it("lista só o que a loja oferece, na ordem retirada, frete, combinar", () => {
    const labels = listDeliveryChoices(CONFIG).map((c) => c.label);
    expect(labels).toEqual(["Retirar no ateliê", "Correios", "Combinar entrega com a loja"]);
    expect(listDeliveryChoices({ ...CONFIG, pickup_enabled: false, arrange_enabled: false })).toHaveLength(1);
  });

  it("resolve a escolha pelo servidor e recusa opção inexistente ou desligada", () => {
    expect(resolveDelivery(CONFIG, { type: "shipping", optionId: "c1" })).toEqual({ method: "shipping", label: "Correios", amount: 22.5 });
    expect(resolveDelivery(CONFIG, { type: "shipping", optionId: "fake" })).toBeNull();
    expect(resolveDelivery({ ...CONFIG, pickup_enabled: false }, { type: "pickup" })).toBeNull();
    expect(resolveDelivery(CONFIG, { type: "pickup" })?.amount).toBe(0);
  });

  it("descarta opções de frete inválidas", () => {
    const parsed = parseShippingOptions([
      { id: "a", label: "Ok", price: 10 },
      { id: "b", label: "", price: 5 },
      { id: "c", label: "Negativo", price: -1 },
      "lixo",
    ]);
    expect(parsed).toEqual([{ id: "a", label: "Ok", price: 10, note: null }]);
    expect(parseShippingOptions(null)).toEqual([]);
  });
});

describe("totais do checkout", () => {
  it("desconto do Pix incide só nos produtos, nunca no frete", () => {
    const t = computeCheckoutTotals({ subtotal: 100, pixDiscountPercent: 5, isPixDirect: true, shippingAmount: 20 });
    expect(t).toEqual({ subtotal: 100, discount: 5, shipping: 20, total: 115 });
  });

  it("sem Pix direto não tem desconto", () => {
    const t = computeCheckoutTotals({ subtotal: 100, pixDiscountPercent: 5, isPixDirect: false, shippingAmount: 0 });
    expect(t.discount).toBe(0);
    expect(t.total).toBe(100);
  });

  it("limita o desconto a 50% e arredonda em centavos", () => {
    expect(computeCheckoutTotals({ subtotal: 33.33, pixDiscountPercent: 99, isPixDirect: true, shippingAmount: 0 }).discount).toBe(16.67);
    expect(computeCheckoutTotals({ subtotal: 10, pixDiscountPercent: 3.333, isPixDirect: true, shippingAmount: 0 }).discount).toBe(0.33);
  });

  it("a soma das linhas fecha com o total, com frete na primeira linha", () => {
    const totals = computeCheckoutTotals({ subtotal: 100, pixDiscountPercent: 10, isPixDirect: true, shippingAmount: 15 });
    const rows = allocateCheckoutTotals([33.33, 33.33, 33.34], totals);
    expect(rows.reduce((s, r) => s + r.finalPrice, 0)).toBeCloseTo(totals.total, 2);
    expect(rows.reduce((s, r) => s + r.discount, 0)).toBeCloseTo(totals.discount, 2);
    expect(rows[0].shipping).toBe(15);
    expect(rows[1].shipping).toBe(0);
  });
});

describe("acompanhamento", () => {
  it("usa a etapa mais atrasada entre as vendas do pedido", () => {
    expect(trackingStage([])).toBe(0);
    expect(trackingStage(["awaiting_payment"])).toBe(0);
    expect(trackingStage(["paid", "in_production"])).toBe(1);
    expect(trackingStage(["shipped", "shipped"])).toBe(3);
  });

  it("cancelada ou expirada vira cancelled", () => {
    expect(trackingStage(["paid", "cancelled"])).toBe("cancelled");
  });
});
