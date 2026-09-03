import { test, expect } from "@playwright/test";

/**
 * Proteção das áreas logadas, feita no middleware.
 *
 * Vale testar no navegador de verdade porque o que está em jogo é o redirect
 * antes do render: um vazamento aqui não aparece em teste de unidade nenhum —
 * a página simplesmente carregaria pra quem não devia.
 */

const ROTAS_PROTEGIDAS = [
  "/dashboard",
  "/dashboard/finance",
  "/dashboard/subscription",
  "/dashboard/settings",
  "/admin",
  "/admin/subscribers",
];

for (const rota of ROTAS_PROTEGIDAS) {
  test(`${rota} manda pro login quando não há sessão`, async ({ page }) => {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/login/);
  });
}

test("nenhuma rota protegida chega a renderizar conteúdo do app", async ({ page }) => {
  // O redirect tem que acontecer antes do render. Se um pedaço da tela logada
  // aparecesse mesmo por um instante, seria vazamento de dado, não só de UI.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
  await expect(page.locator("nav").filter({ hasText: "Filamentos" })).toHaveCount(0);
});
