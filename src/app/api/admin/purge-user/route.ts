/**
 * POST /api/admin/purge-user  (token + email via query or JSON body)
 *
 * Test-account cleanup for the E2E rig: deletes a user, their organization, and
 * EVERY child row. Guarded by {@link checkE2eAuth} — token + e2e+ allowlist —
 * so it can never touch a real account. Idempotent: purging a missing user is
 * still a success, so re-runs never fail cleanup.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { readE2eCreds, checkE2eAuth } from "@/lib/e2e-admin";

export async function POST(req: Request): Promise<Response> {
  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Bindings unavailable" }, { status: 503 });
  }
  const e = env as unknown as { DB: D1Database; E2E_ADMIN_TOKEN?: string };

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

  const orgId = user.orgId;
  const userIds = (
    await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.orgId, orgId)).all()
  ).map((u) => u.id);

  // Delete children before parents. We don't rely on D1 cascade — delete explicitly.
  await db.delete(schema.shareViews).where(eq(schema.shareViews.orgId, orgId));
  await db.delete(schema.shareTokens).where(eq(schema.shareTokens.orgId, orgId));
  await db.delete(schema.businessProfiles).where(eq(schema.businessProfiles.orgId, orgId));
  await db.delete(schema.documentChunks).where(eq(schema.documentChunks.orgId, orgId));
  await db.delete(schema.extractedEntities).where(eq(schema.extractedEntities.orgId, orgId));
  await db.delete(schema.documents).where(eq(schema.documents.orgId, orgId));
  await db.delete(schema.customers).where(eq(schema.customers.orgId, orgId));
  await db.delete(schema.equipment).where(eq(schema.equipment.orgId, orgId));
  await db.delete(schema.processes).where(eq(schema.processes.orgId, orgId));
  await db.delete(schema.employees).where(eq(schema.employees.orgId, orgId));
  await db.delete(schema.financials).where(eq(schema.financials.orgId, orgId));
  await db.delete(schema.readinessScores).where(eq(schema.readinessScores.orgId, orgId));
  await db.delete(schema.readinessChecklist).where(eq(schema.readinessChecklist.orgId, orgId));
  await db.delete(schema.orgMilestones).where(eq(schema.orgMilestones.orgId, orgId));
  if (userIds.length) {
    await db.delete(schema.authTokens).where(inArray(schema.authTokens.userId, userIds));
    await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
  }
  await db.delete(schema.users).where(eq(schema.users.orgId, orgId));
  await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));

  return Response.json({ ok: true, purged: true, orgId, users: userIds.length });
}
