/**
 * POST /api/admin/purge-user  (token + email via query or JSON body)
 *
 * Test-account cleanup for the E2E rig: deletes a user, their organization, and
 * EVERY child row — plus their R2 files and Vectorize vectors. Guarded by
 * {@link checkE2eAuth} — token + e2e+ allowlist — so it can never touch a real
 * account. Idempotent: purging a missing user is still a success.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
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

  const { token, email } = await readE2eCreds(req);
  const auth = checkE2eAuth(e.E2E_ADMIN_TOKEN, token, email);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = drizzle(e.DB, { schema });

  const user = await db
    .select({ id: schema.users.id, orgId: schema.users.orgId })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  if (!user) return Response.json({ ok: true, purged: false, reason: "no such user" });

  const { users } = await purgeOrgs(e, [user.orgId]);

  return Response.json({ ok: true, purged: true, orgId: user.orgId, users });
}
