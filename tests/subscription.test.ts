import { afterEach, describe, expect, it, vi } from "vitest";
import { decidePreapproval, decidePixPayment, PIX_GRACE_PERIOD_DAYS } from "@/lib/subscription";
import { getCyclePricing } from "@/lib/plans";

const NOW = new Date("2026-08-29T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function freezeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

afterEach(() => {
  vi.useRealTimers();
});

function profile(over: Partial<{
  mp_subscription_id: string | null;
  trial_ends_at: string | null;
  paid_until: string | null;
  last_pix_payment_id: string | null;
}> = {}) {
  return {
    mp_subscription_id: null,
    trial_ends_at: null,
    paid_until: null,
    last_pix_payment_id: null,
    ...over,
  };
}

describe("decidePreapproval — webhook de assinatura recorrente (cartão)", () => {
  it("ignora status 'pending' — usuário clicou em Assinar mas ainda não pagou", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "pending",
      preapprovalId: "preapp-1",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ trial_ends_at: new Date(NOW.getTime() + 10 * DAY).toISOString() }),
    });
    expect(res.action).toBe("skip");
    expect(res.reason).toBe("preapproval_pending");
  });

  it("ignora aviso atrasado de preapproval abandonada (stale) — não derruba assinante ativo", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "cancelled",
      preapprovalId: "preapp-velha",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ mp_subscription_id: "preapp-atual" }),
    });
    expect(res.action).toBe("skip");
    expect(res.reason).toBe("stale_preapproval");
  });

  it("aplica cancelamento/pausa só se for a preapproval ATUAL do perfil", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "cancelled",
      preapprovalId: "preapp-atual",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ mp_subscription_id: "preapp-atual" }),
    });
    expect(res.action).toBe("apply");
    expect(res.update.subscription_tier).toBe("free");
    expect(res.update.subscription_status).toBe("cancelled");
    expect(res.update.payment_method).toBeNull();
  });

  it("quando a assinatura não vingou e o usuário AINDA está no trial, volta pro tier do trial (pro), não pro Free", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "cancelled",
      preapprovalId: "preapp-1",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ trial_ends_at: new Date(NOW.getTime() + 5 * DAY).toISOString() }),
    });
    expect(res.action).toBe("apply");
    expect(res.update.subscription_tier).toBe("pro");
    expect(res.update.billing_cycle).toBeNull();
  });

  it("quando a assinatura não vingou e o trial JÁ acabou, cai pra Free", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "cancelled",
      preapprovalId: "preapp-1",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ trial_ends_at: new Date(NOW.getTime() - 5 * DAY).toISOString() }),
    });
    expect(res.action).toBe("apply");
    expect(res.update.subscription_tier).toBe("free");
  });

  it("status 'authorized' ativa o plano com ciclo e método corretos", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "authorized",
      preapprovalId: "preapp-1",
      tier: "pro",
      cycle: "annual",
      profile: profile(),
    });
    expect(res.action).toBe("apply");
    expect(res.update.subscription_tier).toBe("pro");
    expect(res.update.billing_cycle).toBe("annual");
    expect(res.update.subscription_status).toBe("active");
    expect(res.update.payment_method).toBe("card");
    expect(res.update.mp_subscription_id).toBe("preapp-1");
    expect(res.update.paid_until).toBeNull();
  });

  it("status desconhecido vira 'inactive' e rebaixa (respeitando trial)", () => {
    freezeClock();
    const res = decidePreapproval({
      mpStatus: "weird_status",
      preapprovalId: "preapp-1",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ trial_ends_at: new Date(NOW.getTime() + 5 * DAY).toISOString() }),
    });
    expect(res.action).toBe("apply");
    expect(res.update.subscription_tier).toBe("pro");
    expect(res.update.subscription_status).toBe("inactive");
  });
});

describe("decidePixPayment — pagamento Pix avulso já aprovado", () => {
  it("trava idempotência: mesmo paymentId não conta duas vezes", () => {
    freezeClock();
    const res1 = decidePixPayment({
      paymentId: "pay-123",
      tier: "starter",
      cycle: "monthly",
      profile: profile(),
    });
    expect(res1.action).toBe("apply");

    const res2 = decidePixPayment({
      paymentId: "pay-123",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ last_pix_payment_id: "pay-123" }),
    });
    expect(res2.action).toBe("skip");
    expect(res2.reason).toBe("pix_already_credited");
  });

  it("renovação ANTES de vencer soma em cima do que sobrava (não queima dias)", () => {
    freezeClock();
    const paidUntil = new Date(NOW.getTime() + 10 * DAY).toISOString(); // ainda faltam 10 dias
    const res = decidePixPayment({
      paymentId: "pay-1",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ paid_until: paidUntil }),
    });
    const expected = new Date(NOW.getTime() + 10 * DAY + 30 * DAY).toISOString();
    expect(res.action).toBe("apply");
    expect(new Date(res.update.paid_until).getTime()).toBeCloseTo(new Date(expected).getTime(), -3);
  });

  it("renovação DEPOIS de vencer começa a contar de hoje", () => {
    freezeClock();
    const paidUntil = new Date(NOW.getTime() - 5 * DAY).toISOString(); // venceu há 5 dias
    const res = decidePixPayment({
      paymentId: "pay-2",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ paid_until: paidUntil }),
    });
    const expected = new Date(NOW.getTime() + 30 * DAY).toISOString();
    expect(res.action).toBe("apply");
    expect(new Date(res.update.paid_until).getTime()).toBeCloseTo(new Date(expected).getTime(), -3);
  });

  it("renovação exatamente no dia do vencimento conta a partir de hoje (não dobra)", () => {
    freezeClock();
    const paidUntil = NOW.toISOString();
    const res = decidePixPayment({
      paymentId: "pay-3",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ paid_until: paidUntil }),
    });
    const expected = new Date(NOW.getTime() + 30 * DAY).toISOString();
    expect(new Date(res.update.paid_until).getTime()).toBeCloseTo(new Date(expected).getTime(), -3);
  });

  it("pagamento anual concede 360 dias (12 meses × 30)", () => {
    freezeClock();
    const res = decidePixPayment({
      paymentId: "pay-4",
      tier: "pro",
      cycle: "annual",
      profile: profile(),
    });
    const expected = new Date(NOW.getTime() + 360 * DAY).toISOString();
    expect(res.action).toBe("apply");
    expect(new Date(res.update.paid_until).getTime()).toBeCloseTo(new Date(expected).getTime(), -3);
  });

  it("define campos corretos: tier, ciclo, status=active, método=pix, paymentId", () => {
    freezeClock();
    const res = decidePixPayment({
      paymentId: "pay-5",
      tier: "pro",
      cycle: "monthly",
      profile: profile(),
    });
    expect(res.update.subscription_tier).toBe("pro");
    expect(res.update.billing_cycle).toBe("monthly");
    expect(res.update.subscription_status).toBe("active");
    expect(res.update.payment_method).toBe("pix");
    expect(res.update.last_pix_payment_id).toBe("pay-5");
  });

  it("perfil sem paid_until (primeiro Pix) começa a contar de hoje", () => {
    freezeClock();
    const res = decidePixPayment({
      paymentId: "pay-first",
      tier: "starter",
      cycle: "monthly",
      profile: profile({ paid_until: null }),
    });
    const expected = new Date(NOW.getTime() + 30 * DAY).toISOString();
    expect(new Date(res.update.paid_until).getTime()).toBeCloseTo(new Date(expected).getTime(), -3);
  });
});

describe("coerência entre planos e decisão de Pix", () => {
  it("o período calculado bate com getCyclePricing × 30 dias", () => {
    freezeClock();
    for (const tier of ["starter", "pro"] as const) {
      for (const cycle of ["monthly", "annual"] as const) {
        const pricing = getCyclePricing(tier, cycle);
        const res = decidePixPayment({
          paymentId: `pay-${tier}-${cycle}`,
          tier,
          cycle,
          profile: profile(),
        });
        const expectedDays = pricing.frequencyMonths * 30;
        const actualDays = Math.round(
          (new Date(res.update.paid_until).getTime() - NOW.getTime()) / DAY
        );
        expect(actualDays).toBe(expectedDays);
      }
    }
  });
});