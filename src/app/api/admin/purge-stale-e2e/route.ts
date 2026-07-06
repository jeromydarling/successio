/**
 * POST /api/admin/purge-stale-e2e
 *
 * Deletes ALL e2e+ test accounts created more than 2 hours ago.
 * Called by the E2E CI workflow after tests complete as a belt-and-suspenders
 * cleanup for accounts that survive when CI is killed before afterAll runs.
 *
 * Safe: the 2-hour window ensures we never delete an in-flight test account.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, inArray, lt, like, sql } from "drizzle-orm";
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
  const userIds = staleUsers.map((u) => u.id);

  // Delete in dependency order.
  await db.delete(schema.shareViews).where(inArray(schema.shareViews.orgId, orgIds));
  await db.delete(schema.shareTokens).where(inArray(schema.shareTokens.orgId, orgIds));
  await db.delete(schema.businessProfiles).where(inArray(schema.businessProfiles.orgId, orgIds));
  await db.delete(schema.documentChunks).where(inArray(schema.documentChunks.orgId, orgIds));
  await db.delete(schema.extractedEntities).where(inArray(schema.extractedEntities.orgId, orgIds));
  await db.delete(schema.documents).where(inArray(schema.documents.orgId, orgIds));
  await db.delete(schema.customers).where(inArray(schema.customers.orgId, orgIds));
  await db.delete(schema.equipment).where(inArray(schema.equipment.orgId, orgIds));
  await db.delete(schema.processes).where(inArray(schema.processes.orgId, orgIds));
  await db.delete(schema.employees).where(inArray(schema.employees.orgId, orgIds));
  await db.delete(schema.financials).where(inArray(schema.financials.orgId, orgIds));
  await db.delete(schema.readinessScores).where(inArray(schema.readinessScores.orgId, orgIds));
  await db.delete(schema.readinessChecklist).where(inArray(schema.readinessChecklist.orgId, orgIds));
  await db.delete(schema.orgMilestones).where(inArray(schema.orgMilestones.orgId, orgIds));
  await db.delete(schema.adminNotes).where(inArray(schema.adminNotes.orgId, orgIds));
  await db.delete(schema.authTokens).where(inArray(schema.authTokens.userId, userIds));
  await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
  await db.delete(schema.users).where(inArray(schema.users.orgId, orgIds));
  await db.delete(schema.organizations).where(inArray(schema.organizations.id, orgIds));

  console.info(`[purge-stale-e2e] deleted ${orgIds.length} orgs, ${userIds.length} users`);
  return Response.json({ ok: true, purged: orgIds.length });
}
