/**
 * Super admin tRPC router — powers the /superadmin CRM.
 * All procedures require a valid sa_token cookie (see superAdminProcedure in trpc.ts).
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { router, superAdminProcedure } from "../trpc";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";

/** Compute churn risk score (0–4) and signal labels for a single org. */
function churnRisk(orgId: string, signals: {
  A: Set<string>; B: Set<string>; C: Set<string>; D: Set<string>;
}): { score: number; labels: string[] } {
  const labels: string[] = [];
  if (signals.A.has(orgId)) labels.push("No login 7d");
  if (signals.B.has(orgId)) labels.push("Score stalled 14d");
  if (signals.C.has(orgId)) labels.push("No uploads 14d");
  if (signals.D.has(orgId)) labels.push("Profile unshared");
  return { score: labels.length, labels };
}

export const superadminRouter = router({
  /** All orgs with key metrics + churn risk. */
  list: superAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const nowSec = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = nowSec - 7 * 86400;
    const fourteenDaysAgo = nowSec - 14 * 86400;

    const [orgs, latestScores, lastLogins, lastDocs, signalBRows, signalCRows, signalDRows] =
      await Promise.all([
        db
          .select({
            id: schema.organizations.id,
            name: schema.organizations.name,
            vertical: schema.organizations.vertical,
            location: schema.organizations.location,
            createdAt: schema.organizations.createdAt,
          })
          .from(schema.organizations)
          .where(sql`${schema.organizations.id} NOT LIKE 'demo-%'`)
          .orderBy(desc(schema.organizations.createdAt))
          .all(),

        db
          .all<{ org_id: string; score: number }>(
            sql`SELECT org_id, score FROM readiness_scores WHERE id IN (
              SELECT id FROM readiness_scores r2 WHERE r2.org_id = readiness_scores.org_id
              ORDER BY created_at DESC LIMIT 1
            )`
          ),

        db
          .all<{ org_id: string; last_login: number | null }>(
            sql`SELECT u.org_id, MAX(s.created_at) as last_login
                FROM users u LEFT JOIN sessions s ON s.user_id = u.id
                WHERE u.role = 'owner'
                GROUP BY u.org_id`
          ),

        db
          .all<{ org_id: string; last_doc: number | null }>(
            sql`SELECT org_id, MAX(created_at) as last_doc
                FROM documents GROUP BY org_id`
          ),

        // Signal B: score unchanged 14d
        db.all<{ org_id: string }>(
          sql`SELECT org_id FROM readiness_scores GROUP BY org_id
              HAVING MAX(created_at) < ${fourteenDaysAgo}`
        ),

        // Signal C: no upload 14d
        db.all<{ org_id: string }>(
          sql`SELECT org_id FROM documents GROUP BY org_id
              HAVING MAX(created_at) < ${fourteenDaysAgo}`
        ),

        // Signal D: profile published but no share tokens
        db.all<{ org_id: string }>(
          sql`SELECT bp.org_id FROM business_profiles bp
              LEFT JOIN share_tokens st ON st.org_id = bp.org_id
              WHERE bp.is_draft = 0 AND st.id IS NULL`
        ),
      ]);

    const scoreMap = new Map(latestScores.map((r) => [r.org_id, r.score]));
    const loginMap = new Map(lastLogins.map((r) => [r.org_id, r.last_login]));
    const docMap = new Map(lastDocs.map((r) => [r.org_id, r.last_doc]));

    const signals = {
      A: new Set(
        lastLogins
          .filter((r) => r.last_login === null || r.last_login < sevenDaysAgo)
          .map((r) => r.org_id)
      ),
      B: new Set(signalBRows.map((r) => r.org_id)),
      C: new Set(signalCRows.map((r) => r.org_id)),
      D: new Set(signalDRows.map((r) => r.org_id)),
    };

    return orgs.map((org) => ({
      ...org,
      latestScore: scoreMap.get(org.id) ?? null,
      lastLogin: loginMap.get(org.id) ?? null,
      lastDoc: docMap.get(org.id) ?? null,
      churn: churnRisk(org.id, signals),
    }));
  }),

  /** Single org detail: info + score history + documents + notes. */
  orgDetail: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { orgId } = input;
      const db = ctx.db;

      const [org, scores, documents, notes, users] = await Promise.all([
        db
          .select()
          .from(schema.organizations)
          .where(eq(schema.organizations.id, orgId))
          .get(),

        db
          .select({
            score: schema.readinessScores.score,
            breakdown: schema.readinessScores.breakdown,
            createdAt: schema.readinessScores.createdAt,
          })
          .from(schema.readinessScores)
          .where(eq(schema.readinessScores.orgId, orgId))
          .orderBy(desc(schema.readinessScores.createdAt))
          .limit(30)
          .all(),

        db
          .select({
            id: schema.documents.id,
            originalName: schema.documents.originalName,
            status: schema.documents.status,
            fileType: schema.documents.fileType,
            sizeBytes: schema.documents.sizeBytes,
            createdAt: schema.documents.createdAt,
          })
          .from(schema.documents)
          .where(eq(schema.documents.orgId, orgId))
          .orderBy(desc(schema.documents.createdAt))
          .limit(50)
          .all(),

        db
          .select()
          .from(schema.adminNotes)
          .where(eq(schema.adminNotes.orgId, orgId))
          .orderBy(desc(schema.adminNotes.createdAt))
          .all(),

        db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            role: schema.users.role,
            createdAt: schema.users.createdAt,
          })
          .from(schema.users)
          .where(eq(schema.users.orgId, orgId))
          .all(),
      ]);

      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return { org, scores, documents, notes, users };
    }),

  /** Add a CRM note to an org. */
  createNote: superAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        content: z.string().min(1).max(2000),
        author: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();
      await ctx.db.insert(schema.adminNotes).values({
        id,
        orgId: input.orgId,
        content: input.content,
        author: input.author,
      });
      return { id };
    }),

  /** Delete a CRM note. */
  deleteNote: superAdminProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(schema.adminNotes)
        .where(eq(schema.adminNotes.id, input.noteId));
      return { ok: true };
    }),

  /** All orgs with geocoordinates for the map. Lazily geocodes up to 10 un-geocoded orgs. */
  mapData: superAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    // Find orgs that have a location text but no coordinates yet.
    const needsGeocode = await db
      .select({ id: schema.organizations.id, location: schema.organizations.location })
      .from(schema.organizations)
      .where(
        and(
          sql`${schema.organizations.location} IS NOT NULL`,
          isNull(schema.organizations.lat)
        )
      )
      .limit(10)
      .all();

    // Geocode sequentially (Nominatim: 1 req/sec max).
    for (const org of needsGeocode) {
      try {
        const q = encodeURIComponent(org.location!);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          {
            headers: { "User-Agent": "Successio/1.0 (admin-crm; contact@successio.pro)" },
            signal: AbortSignal.timeout(8_000),
          }
        );
        if (!res.ok) continue;
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data[0]) {
          await db
            .update(schema.organizations)
            .set({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
            .where(eq(schema.organizations.id, org.id));
        }
      } catch {
        // Non-fatal: just leave lat/lng null.
      }
      // Respect Nominatim rate limit.
      await new Promise((r) => setTimeout(r, 1100));
    }

    const orgs = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        vertical: schema.organizations.vertical,
        location: schema.organizations.location,
        lat: schema.organizations.lat,
        lng: schema.organizations.lng,
      })
      .from(schema.organizations)
      .where(sql`${schema.organizations.id} NOT LIKE 'demo-%'`)
      .all();

    const latestScores = await db.all<{ org_id: string; score: number }>(
      sql`SELECT org_id, score FROM readiness_scores WHERE id IN (
        SELECT id FROM readiness_scores r2 WHERE r2.org_id = readiness_scores.org_id
        ORDER BY created_at DESC LIMIT 1
      )`
    );
    const scoreMap = new Map(latestScores.map((r) => [r.org_id, r.score]));

    return orgs.map((org) => ({
      ...org,
      latestScore: scoreMap.get(org.id) ?? null,
    }));
  }),
});
