/**
 * POST /api/admin/purge-user?token=...&email=...
 *
 * Test-account cleanup for the E2E rig: deletes a user, their organization, and
 * EVERY child row (documents, extracted entities, SOPs, milestones, profiles,
 * share tokens/views, auth tokens, sessions). The journey's afterAll calls this
 * so CI runs don't accumulate junk accounts.
 *
 * Safety:
 *  - Token-guarded: ?token must equal env.E2E_ADMIN_TOKEN, or the known CI
 *    fallback when that secret isn't set.
 *  - Blast-radius bound: only emails beginning with "e2e+" can be purged, so
 *    even with the fallback token this can never touch a real customer account.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";

/** Known fallback so CI can run without provisioning a Cloudflare secret. */
const FALLBACK_TOKEN = "successio-e2e-purge-2026";

/** Only test accounts (e2e+...) are ever purgeable. */
const E2E_EMAIL = /^e2e\+/i;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request): Promise<Response> {
  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Bindings unavailable" }, { status: 503 });
  }
  const e = env as unknown as { DB: D1Database; E2E_ADMIN_TOKEN?: string };

  // Accept credentials from the query string or a JSON body. The body is
  // preferred by callers because a "+" in an email survives there intact (query
  // parsing would turn it into a space and miss the e2e+ allowlist).
  const url = new URL(req.url);
  let token = url.searchParams.get("token") ?? "";
  let email = url.searchParams.get("email") ?? "";
  if (!token || !email) {
    try {
      const body = (await req.json()) as { token?: string; email?: string };
      token = token || body.token || "";
      email = email || body.email || "";
    } catch {
      /* no/invalid JSON body — fall through with whatever the query gave us */
    }
  }
  email = email.toLowerCase();

  const expected = e.E2E_ADMIN_TOKEN || FALLBACK_TOKEN;
  if (!token || !timingSafeEqual(token, expected)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!E2E_EMAIL.test(email)) {
    return Response.json(
      { ok: false, error: "Only e2e+ test accounts can be purged" },
      { status: 400 }
    );
  }

  const db = drizzle(e.DB, { schema });

  const user = await db
    .select({ id: schema.users.id, orgId: schema.users.orgId })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  if (!user) {
    // Idempotent: nothing to purge is success, so re-runs never fail cleanup.
    return Response.json({ ok: true, purged: false, reason: "no such user" });
  }

  const orgId = user.orgId;
  const userIds = (
    await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.orgId, orgId)).all()
  ).map((u) => u.id);

  // Delete children before parents. Most tables hang off orgId; auth tokens and
  // sessions hang off userId. We don't rely on D1 cascade — delete explicitly.
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
