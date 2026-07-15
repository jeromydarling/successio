// Setup file: bring the test D1 database to the current schema before any
// integration test runs — the same migrations CI applies to production.
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
