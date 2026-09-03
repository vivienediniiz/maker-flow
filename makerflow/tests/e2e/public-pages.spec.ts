import { test, expect } from "@playwright/test";
import { PLANS, getCyclePricing } from "@/lib/plans";
import { TERMS_UPDATED_AT, PRIVACY_UPDATED_AT } from "@/lib/legal";
import { formatBRL } from "@/lib/utils";

/**
 * Páginas públicas. Só leitura — nada aqui escreve no banco.
 *
 * Os preços e as datas vêm dos mesmos módulos que a aplicação usa, de
 * propósito: assim o teste falha quando a página parar de refletir a fonte da
 * verdade, e não quando alguém trocar um preço legitimamente.
 */

test("a landing carrega na raiz para quem não está logado", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Começar grátis/i }).first()).toBeVisible();
});

test("/home continua respondendo, redirecionado pra raiz", async ({ page }) => {
  // A landing já morou em /home. O redirect existe pra não quebrar link
  // antigo que alguém tenha compartilhado.
  await page.goto("/home");
  await expect(page).toHaveURL(/\/$/);
});

test("a página de planos mostra os três planos com os preços do código", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: /Comece grátis/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grátis", exact: true })).toBeVisible();

  for (const plano of PLANS) {
    await expect(page.getByRole("heading", { name: plano.name, exact: true })).toBeVisible();
    const preco = formatBRL(getCyclePricing(plano.id, "monthly").price);
    await expect(page.getByText(preco, { exact: true }).first()).toBeVisible();
  }
});

test("os documentos legais mostram a data que está em lib/legal", async ({ page }) => {
  // Se estas datas divergirem, o aceite gravado em profiles.terms_version
  // passa a apontar pro texto errado — que é justamente o que ele prova.
  await page.goto("/terms");
  await expect(page.getByText(`Última atualização: ${TERMS_UPDATED_AT}`)).toBeVisible();

  await page.goto("/privacy-policy");
  await expect(page.getByText(`Última atualização: ${PRIVACY_UPDATED_AT}`)).toBeVisible();
});

test("a tela de login carrega", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
});
