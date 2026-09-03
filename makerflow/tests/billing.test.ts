import { afterEach, describe, expect, it, vi } from "vitest";
import { pixBillingState, pixDaysUntilDue, pixGraceDaysLeft } from "@/lib/pix";
import { trialDaysRemaining, isTrialExpired } from "@/lib/trial";
import { encodeExternalReference, decodeExternalReference, getCyclePricing, PIX_GRACE_PERIOD_DAYS } from "@/lib/plans";
import { canCreateMore, canCreateMoreQuotes, limitFor } from "@/lib/entitlements";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const fromNow = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

function freezeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("pixBillingState", () => {
  it("trata ausência de paid_until como vencido — sem pagamento, sem plano", () => {
    expect(pixBillingState(null)).toBe("expired");
    expect(pixBillingState(undefined)).toBe("expired");
  });

  it("está ativo enquanto não passou de paid_until", () => {
    freezeClock();
    expect(pixBillingState(fromNow(5))).toBe("active");
  });

  it("entra em tolerância logo depois de vencer", () => {
    freezeClock();
    expect(pixBillingState(fromNow(-1))).toBe("grace");
  });

  it("vence de vez depois da tolerância", () => {
    freezeClock();
    expect(pixBillingState(fromNow(-(PIX_GRACE_PERIOD_DAYS + 1)))).toBe("expired");
  });

  it("conta os dias que faltam e os dias de tolerância que sobraram", () => {
    freezeClock();
    expect(pixDaysUntilDue(fromNow(7))).toBe(7);
    expect(pixGraceDaysLeft(fromNow(-1))).toBe(PIX_GRACE_PERIOD_DAYS - 1);
    expect(pixGraceDaysLeft(null)).toBe(0);
  });
});

describe("trial", () => {
  it("conta os dias restantes do período de teste", () => {
    freezeClock();
    expect(trialDaysRemaining(fromNow(14))).toBe(14);
    expect(trialDaysRemaining(fromNow(1))).toBe(1);
  });

  it("nunca devolve dias negativos", () => {
    freezeClock();
    expect(trialDaysRemaining(fromNow(-30))).toBe(0);
  });

  it("considera expirado quando não há data — conta sem trial não ganha um de brinde", () => {
    expect(isTrialExpired(null)).toBe(true);
    expect(isTrialExpired(undefined)).toBe(true);
  });

  it("considera expirado assim que os dias acabam", () => {
    freezeClock();
    expect(isTrialExpired(fromNow(-1))).toBe(true);
    expect(isTrialExpired(fromNow(1))).toBe(false);
  });
});

describe("external_reference", () => {
  // É por este campo que o webhook descobre de quem é o pagamento. Se a ida e
  // a volta não baterem, o pagamento entra na conta errada.
  it("sobrevive à ida e volta", () => {
    const ref = encodeExternalReference("user-123", "starter", "annual", "pix");
    expect(decodeExternalReference(ref)).toEqual({
      userId: "user-123",
      tier: "starter",
      cycle: "annual",
      method: "pix",
    });
  });

  it("assume cartão quando o método não veio — formato antigo de referência", () => {
    expect(decodeExternalReference("user-123|pro|monthly").method).toBe("card");
  });
});

describe("preços por ciclo", () => {
  it("cobra 12x o período do mensal no anual, com desconto", () => {
    const mensal = getCyclePricing("starter", "monthly");
    const anual = getCyclePricing("starter", "annual");

    expect(mensal.frequencyMonths).toBe(1);
    expect(anual.frequencyMonths).toBe(12);
    expect(anual.price).toBeLessThan(mensal.price * 12);
  });

  it("mantém o Pro mais caro que o Starter nos dois ciclos", () => {
    expect(getCyclePricing("pro", "monthly").price).toBeGreaterThan(getCyclePricing("starter", "monthly").price);
    expect(getCyclePricing("pro", "annual").price).toBeGreaterThan(getCyclePricing("starter", "annual").price);
  });
});

describe("limites de plano", () => {
  it("barra o Free exatamente no limite, não depois", () => {
    expect(canCreateMore("free", "clients", 14)).toBe(true);
    expect(canCreateMore("free", "clients", 15)).toBe(false);
    expect(canCreateMoreQuotes("free", 5)).toBe(false);
  });

  it("dá ao Starter mais espaço que ao Free em todos os recursos", () => {
    const recursos = ["clients", "products", "filaments", "branches", "printers", "quotesPerMonth"] as const;
    for (const recurso of recursos) {
      expect(limitFor("starter", recurso)).toBeGreaterThan(limitFor("free", recurso));
    }
  });

  it("não impõe limite ao Pro", () => {
    expect(canCreateMore("pro", "clients", 10_000)).toBe(true);
    expect(canCreateMoreQuotes("pro", 10_000)).toBe(true);
  });
});
