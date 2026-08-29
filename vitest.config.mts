import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve os imports "@/..." lendo os paths do tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // tests/e2e é do Playwright (npm run test:e2e), não do Vitest.
    exclude: ["tests/e2e/**"],
  },
});
