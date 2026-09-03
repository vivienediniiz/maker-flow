import { test, expect } from "@playwright/test";

/**
 * Trava de consentimento no cadastro (P0 da auditoria pré-lançamento).
 *
 * Nenhum teste aqui chega a criar conta: todos param antes do submit. O que
 * está sendo verificado é justamente que **não dá** pra passar sem aceitar.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/signup");
});

test("o botão de criar conta nasce bloqueado", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Crie sua conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeDisabled();
});

test("marcar o aceite libera o botão, e desmarcar bloqueia de novo", async ({ page }) => {
  const aceite = page.getByRole("checkbox");
  const criarConta = page.getByRole("button", { name: "Criar conta" });

  await expect(aceite).not.toBeChecked();

  await aceite.check();
  await expect(criarConta).toBeEnabled();

  await aceite.uncheck();
  await expect(criarConta).toBeDisabled();
});

test("o cadastro pelo Google também exige o aceite, e explica o motivo", async ({ page }) => {
  // Botão desabilitado e mudo perde cadastro. O clique sem aceite tem que
  // dizer o que fazer — e não pode sair da página pro Google.
  await page.getByRole("button", { name: /Continuar com Google/i }).click();

  await expect(page.getByText(/Marque o aceite dos Termos de Uso/i)).toBeVisible();
  await expect(page).toHaveURL(/\/signup/);
});

test("os dois documentos estão linkados e abrem de verdade", async ({ page, context }) => {
  const termos = page.getByRole("link", { name: "Termos de Uso" });
  const privacidade = page.getByRole("link", { name: "Política de Privacidade" });

  await expect(termos).toHaveAttribute("href", "/terms");
  await expect(privacidade).toHaveAttribute("href", "/privacy-policy");
  // Abrir em aba nova é o que impede o formulário preenchido de se perder.
  await expect(termos).toHaveAttribute("target", "_blank");
  await expect(privacidade).toHaveAttribute("target", "_blank");

  const paginaTermos = await context.newPage();
  await paginaTermos.goto("/terms");
  await expect(paginaTermos.getByRole("heading", { name: /Termos de Uso/i }).first()).toBeVisible();

  const paginaPrivacidade = await context.newPage();
  await paginaPrivacidade.goto("/privacy-policy");
  await expect(
    paginaPrivacidade.getByRole("heading", { name: /Política de Privacidade/i }).first()
  ).toBeVisible();
});
