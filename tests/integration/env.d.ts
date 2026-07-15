/// <reference types="@cloudflare/vitest-pool-workers" />

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    DOCUMENTS: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
  }
}
