import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve os imports "@/..." lendo os paths do tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
