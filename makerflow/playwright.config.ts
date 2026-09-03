import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de navegador. Complementa os testes de lógica (`npm test`, Vitest), que
 * cobrem as decisões de assinatura sem subir nada.
 *
 * Tudo que está em tests/e2e é somente-leitura de propósito: nenhum spec cria
 * conta, paga ou escreve no banco. O projeto ainda não tem um Supabase de
 * teste separado, e a suite roda contra o mesmo banco de produção — então
 * qualquer teste que escreva fica pra quando esse ambiente existir.
 *
 * Por padrão sobe o `npm run dev` sozinho. Pra apontar pra produção ou pra um
 * servidor já rodando, use E2E_BASE_URL.
 */

const DEFAULT_URL = "http://localhost:3000";
const baseURL = process.env.E2E_BASE_URL ?? DEFAULT_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Com E2E_BASE_URL apontando pra outro lugar, não faz sentido subir o dev.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: DEFAULT_URL,
        reuseExistingServer: true,
        // Primeira compilação do Next é lenta; 3 min evita falso negativo.
        timeout: 180_000,
      },
});
