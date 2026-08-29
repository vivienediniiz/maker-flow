import { describe, expect, it } from "vitest";
import { decidePreapproval, decidePixPayment } from "@/lib/subscription";

// Instante fixo pra tudo aqui: 29/08/2026, 12:00 UTC.
const NOW = new Date("2026-08-29T12:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

describe("decidePreapproval", () => {
  const base = { preapprovalId: "PRE-1", tier: "starter", cycle: "monthly", now: NOW } as const;

  it("ignora o preapproval recém-criado (pending) em vez de rebaixar o plano", () => {
    // Regressão de 29/08/2026: /api/mercadopago/create-preapproval cria a
    // assinatura como "pending" e o MP avisa no mesmo instante. O webhook
    // tratava isso como rebaixamento, então clicar em "Assinar" já derrubava
    // uma conta nova do trial pro Free, antes de qualquer pagamento.
    const decision = decidePreapproval({
      ...base,
      mpStatus: "pending",
      profile: { trial_ends_at: iso(NOW + 14 * DAY), mp_subscription_id: null },
    });

    expect(decision).toEqual({ action: "skip", reason: "preapproval_pending" });
  });

  it("ignora cancelamento de uma assinatura que não é a atual do perfil", () => {
    // Regressão de 29/08/2026: o aviso atrasado de uma tentativa de assinatura
    // abandonada chegou depois do pagamento e rebaixou uma assinante que já
    // tinha pago por outro caminho.
    const decision = decidePreapproval({
      ...base,
      preapprovalId: "PRE-ABANDONADO",
      mpStatus: "cancelled",
      profile: { mp_subscription_id: "PRE-VALENDO", trial_ends_at: null },
    });

    expect(decision).toEqual({ action: "skip", reason: "stale_preapproval" });
  });

  it("aplica cancelamento quando é a assinatura atual do perfil", () => {
    const decision = decidePreapproval({
      ...base,
      preapprovalId: "PRE-VALENDO",
      mpStatus: "cancelled",
      profile: { mp_subscription_id: "PRE-VALENDO", trial_ends_at: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.subscription_tier).toBe("free");
    expect(decision.update.subscription_status).toBe("cancelled");
    expect(decision.update.payment_method).toBeNull();
  });

  it("aplica cancelamento quando o perfil ainda não tem assinatura registrada", () => {
    const decision = decidePreapproval({
      ...base,
      mpStatus: "cancelled",
      profile: { mp_subscription_id: null, trial_ends_at: null },
    });

    expect(decision.action).toBe("apply");
  });

  it("ativa o plano quando a assinatura é autorizada", () => {
    const decision = decidePreapproval({
      ...base,
      tier: "pro",
      cycle: "annual",
      mpStatus: "authorized",
      profile: { mp_subscription_id: null, trial_ends_at: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update).toMatchObject({
      subscription_tier: "pro",
      billing_cycle: "annual",
      subscription_status: "active",
      payment_method: "card",
      mp_subscription_id: "PRE-1",
    });
  });

  it("ativa mesmo quando o perfil aponta pra outra assinatura — autorizado sempre vale", () => {
    // A trava de assinatura obsoleta só existe pra rebaixamento. Uma nova
    // assinatura autorizada tem que substituir a anterior, não ser ignorada.
    const decision = decidePreapproval({
      ...base,
      preapprovalId: "PRE-NOVA",
      mpStatus: "authorized",
      profile: { mp_subscription_id: "PRE-ANTIGA", trial_ends_at: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.mp_subscription_id).toBe("PRE-NOVA");
  });

  it("devolve o usuário ao trial, não ao Free, se o trial ainda não venceu", () => {
    const decision = decidePreapproval({
      ...base,
      mpStatus: "cancelled",
      profile: { mp_subscription_id: null, trial_ends_at: iso(NOW + 3 * DAY) },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.subscription_tier).toBe("pro");
  });

  it("rebaixa pro Free quando o trial já venceu", () => {
    const decision = decidePreapproval({
      ...base,
      mpStatus: "cancelled",
      profile: { mp_subscription_id: null, trial_ends_at: iso(NOW - 1 * DAY) },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.subscription_tier).toBe("free");
  });

  it("trata status desconhecido do Mercado Pago como inativo, nunca como ativo", () => {
    const decision = decidePreapproval({
      ...base,
      mpStatus: "algo_que_o_mp_inventou",
      profile: { mp_subscription_id: null, trial_ends_at: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.subscription_status).toBe("inactive");
    expect(decision.update.subscription_tier).toBe("free");
  });

  it("não quebra com perfil inexistente", () => {
    const decision = decidePreapproval({ ...base, mpStatus: "authorized", profile: null });
    expect(decision.action).toBe("apply");
  });
});

describe("decidePixPayment", () => {
  const base = { paymentId: "PAY-1", tier: "starter", cycle: "monthly", now: NOW } as const;

  it("credita 30 dias no primeiro pagamento mensal", () => {
    const decision = decidePixPayment({
      ...base,
      profile: { paid_until: null, last_pix_payment_id: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.paid_until).toBe(iso(NOW + 30 * DAY));
    expect(decision.update).toMatchObject({
      subscription_tier: "starter",
      subscription_status: "active",
      payment_method: "pix",
      last_pix_payment_id: "PAY-1",
    });
  });

  it("credita 360 dias no plano anual", () => {
    const decision = decidePixPayment({
      ...base,
      cycle: "annual",
      profile: { paid_until: null, last_pix_payment_id: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.paid_until).toBe(iso(NOW + 360 * DAY));
  });

  it("ignora o reenvio do mesmo pagamento em vez de somar outro período", () => {
    // Regressão: o Mercado Pago reenvia o aviso do mesmo pagamento. Sem a
    // trava, cada reenvio somava mais 30 dias — assinatura de graça.
    const decision = decidePixPayment({
      ...base,
      profile: { paid_until: iso(NOW + 30 * DAY), last_pix_payment_id: "PAY-1" },
    });

    expect(decision).toEqual({ action: "skip", reason: "pix_already_credited" });
  });

  it("soma em cima do que sobrava quando a renovação é paga antes de vencer", () => {
    // Quem renova faltando 8 dias não pode perder esses 8 dias.
    const decision = decidePixPayment({
      ...base,
      paymentId: "PAY-2",
      profile: { paid_until: iso(NOW + 8 * DAY), last_pix_payment_id: "PAY-1" },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.paid_until).toBe(iso(NOW + 38 * DAY));
  });

  it("conta a partir de hoje quando o período anterior já venceu", () => {
    const decision = decidePixPayment({
      ...base,
      paymentId: "PAY-2",
      profile: { paid_until: iso(NOW - 10 * DAY), last_pix_payment_id: "PAY-1" },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.paid_until).toBe(iso(NOW + 30 * DAY));
  });

  it("não gera data inválida se paid_until estiver corrompido", () => {
    const decision = decidePixPayment({
      ...base,
      profile: { paid_until: "isto não é uma data", last_pix_payment_id: null },
    });

    expect(decision.action).toBe("apply");
    if (decision.action !== "apply") return;
    expect(decision.update.paid_until).toBe(iso(NOW + 30 * DAY));
  });
});
