/**
 * Integration-test config: runs tests inside workerd via Miniflare with real
 * D1 (migrations applied) and R2 bindings — the queue consumer and score
 * engine are exercised against the actual database engine, not mocks.
 *
 * Run with: npm run test:integration
 */

import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));

  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      include: ["tests/integration/**/*.test.ts"],
      setupFiles: ["tests/integration/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          miniflare: {
            compatibilityDate: "2024-09-23",
            compatibilityFlags: ["nodejs_compat"],
            d1Databases: ["DB"],
            r2Buckets: ["DOCUMENTS"],
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
