import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Unit tests only — tests/integration/** runs inside workerd via
    // vitest.workers.config.ts (npm run test:integration).
    include: ["tests/unit/**/*.test.ts"],
  },
});
