/**
 * POST /api/admin/purge-stale-e2e
 *
 * Deletes ALL e2e+ test accounts created more than 2 hours ago — D1 rows, R2
 * files, and Vectorize vectors. Called by the E2E CI workflow after tests
 * complete as a belt-and-suspenders cleanup for accounts that survive when CI
 * is killed before afterAll runs.
 *
 * Safe: the 2-hour window ensures we never delete an in-flight test account.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { readE2eCreds, checkE2eAuth } from "@/lib/e2e-admin";
import { purgeOrgs, type PurgeEnv } from "@/lib/purge-org";

export async function POST(req: Request): Promise<Response> {
  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Bindings unavailable" }, { status: 503 });
  }
  const e = env as unknown as PurgeEnv & { E2E_ADMIN_TOKEN?: string };

  // Only the token is required here — no email allowlist since this deletes by email pattern.
  const { token } = await readE2eCreds(req);
  const auth = checkE2eAuth(e.E2E_ADMIN_TOKEN, token, "e2e+stale@successio.pro");
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = drizzle(e.DB, { schema });
  const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;

  // Find stale e2e users.
  const staleUsers = await db
    .select({ id: schema.users.id, orgId: schema.users.orgId, email: schema.users.email })
    .from(schema.users)
    .where(
      sql`${schema.users.email} LIKE 'e2e+%' AND ${schema.users.createdAt} < ${twoHoursAgo}`
    )
    .all();

  if (!staleUsers.length) {
    return Response.json({ ok: true, purged: 0 });
  }

  const orgIds = [...new Set(staleUsers.map((u) => u.orgId))];
  const { users } = await purgeOrgs(e, orgIds);

  console.info(`[purge-stale-e2e] deleted ${orgIds.length} orgs, ${users} users`);
  return Response.json({ ok: true, purged: orgIds.length });
}
