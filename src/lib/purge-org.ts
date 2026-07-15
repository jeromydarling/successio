/**
 * Complete deletion of one or more organizations: every D1 row, every R2
 * object, and every Vectorize vector. Shared by the E2E purge endpoints —
 * and the future user-facing "delete my account" flow — so nothing is ever
 * cleaned in one store and orphaned in another.
 */

import { drizzle } from "drizzle-orm/d1";
import { inArray, isNotNull, and } from "drizzle-orm";
import * as schema from "@/db/schema";

export interface PurgeEnv {
  DB: D1Database;
  DOCUMENTS?: R2Bucket;
  VECTORS?: VectorizeIndex;
}

/** Deletes the given orgs and all their data across D1, R2, and Vectorize. */
export async function purgeOrgs(env: PurgeEnv, orgIds: string[]): Promise<{ users: number }> {
  if (orgIds.length === 0) return { users: 0 };
  const db = drizzle(env.DB, { schema });

  const userIds = (
    await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.orgId, orgIds))
      .all()
  ).map((u) => u.id);

  // Collect external-store references BEFORE deleting the D1 rows that hold them.
  const r2Keys = (
    await db
      .select({ r2Key: schema.documents.r2Key })
      .from(schema.documents)
      .where(inArray(schema.documents.orgId, orgIds))
      .all()
  ).map((d) => d.r2Key);

  const vectorIds = (
    await db
      .select({ vectorId: schema.documentChunks.vectorId })
      .from(schema.documentChunks)
      .where(
        and(
          inArray(schema.documentChunks.orgId, orgIds),
          isNotNull(schema.documentChunks.vectorId)
        )
      )
      .all()
  ).map((c) => c.vectorId as string);

  // R2: delete stored files (batches of 1000 — the binding's per-call cap).
  if (env.DOCUMENTS && r2Keys.length > 0) {
    for (let i = 0; i < r2Keys.length; i += 1000) {
      try {
        await env.DOCUMENTS.delete(r2Keys.slice(i, i + 1000));
      } catch (err) {
        console.error("[purge-org] R2 delete failed:", err);
      }
    }
  }

  // Vectorize: remove embeddings so deleted businesses can't surface in search.
  if (env.VECTORS && vectorIds.length > 0) {
    for (let i = 0; i < vectorIds.length; i += 1000) {
      try {
        await env.VECTORS.deleteByIds(vectorIds.slice(i, i + 1000));
      } catch (err) {
        console.error("[purge-org] Vectorize delete failed:", err);
      }
    }
  }

  // D1: children before parents — cascades aren't relied on.
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
  if (userIds.length > 0) {
    await db.delete(schema.authTokens).where(inArray(schema.authTokens.userId, userIds));
    await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
  }
  await db.delete(schema.users).where(inArray(schema.users.orgId, orgIds));
  await db.delete(schema.organizations).where(inArray(schema.organizations.id, orgIds));

  return { users: userIds.length };
}
