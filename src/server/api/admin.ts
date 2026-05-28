/**
 * Admin tRPC router — association portal.
 * Only accessible to users with role = "association_admin".
 * Provides aggregate metrics across all orgs in the platform.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, count, avg, desc, gte } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import {
  organizations,
  users,
  readinessScores,
  documents,
} from "@/db/schema";

/** Procedure that additionally checks for association_admin role. */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Re-query user role to ensure it hasn't changed since token was issued
  const user = await ctx.db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, ctx.session.sub))
    .get();

  if (!user || user.role !== "association_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Association admin access required" });
  }

  return next({ ctx });
});

export const adminRouter = router({
  /** Aggregate platform overview. */
  overview: adminProcedure.query(async ({ ctx }) => {
    const [orgCount, userCount, docCount] = await Promise.all([
      ctx.db.select({ n: count() }).from(organizations).get(),
      ctx.db.select({ n: count() }).from(users).get(),
      ctx.db.select({ n: count() }).from(documents).get(),
    ]);

    // Average readiness score — take the most recent score per org
    // Approximation: just avg all score records
    const avgScore = await ctx.db
      .select({ avg: avg(readinessScores.score) })
      .from(readinessScores)
      .get();

    // Docs processed in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDocs = await ctx.db
      .select({ n: count() })
      .from(documents)
      .where(gte(documents.createdAt, thirtyDaysAgo))
      .get();

    return {
      orgCount:     orgCount?.n ?? 0,
      userCount:    userCount?.n ?? 0,
      docCount:     docCount?.n ?? 0,
      avgScore:     Math.round(Number(avgScore?.avg ?? 0)),
      recentDocs:   recentDocs?.n ?? 0,
    };
  }),

  /** List all orgs with their latest readiness score. */
  listOrgs: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input, ctx }) => {
      const orgs = await ctx.db
        .select()
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(input.limit)
        .all();

      // Fetch latest score for each org
      const scores = await Promise.all(
        orgs.map((org) =>
          ctx.db
            .select({ score: readinessScores.score })
            .from(readinessScores)
            .where(eq(readinessScores.orgId, org.id))
            .orderBy(desc(readinessScores.createdAt))
            .limit(1)
            .get()
        )
      );

      // Fetch doc count per org
      const docCounts = await Promise.all(
        orgs.map((org) =>
          ctx.db
            .select({ n: count() })
            .from(documents)
            .where(eq(documents.orgId, org.id))
            .get()
        )
      );

      return orgs.map((org, i) => ({
        ...org,
        latestScore: scores[i]?.score ?? null,
        docCount: docCounts[i]?.n ?? 0,
      }));
    }),

  /** Score distribution bucketed into ranges (for histogram). */
  scoreDistribution: adminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.select({ id: organizations.id }).from(organizations).all();

    const scores = await Promise.all(
      orgs.map((o) =>
        ctx.db
          .select({ score: readinessScores.score })
          .from(readinessScores)
          .where(eq(readinessScores.orgId, o.id))
          .orderBy(desc(readinessScores.createdAt))
          .limit(1)
          .get()
      )
    );

    const distribution = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
    for (const s of scores) {
      if (!s) continue;
      const v = s.score;
      if (v <= 20) distribution["0–20"]++;
      else if (v <= 40) distribution["21–40"]++;
      else if (v <= 60) distribution["41–60"]++;
      else if (v <= 80) distribution["61–80"]++;
      else distribution["81–100"]++;
    }

    return distribution;
  }),

  /** Vertical breakdown — how many orgs per vertical. */
  verticalBreakdown: adminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.select({ vertical: organizations.vertical }).from(organizations).all();
    const counts: Record<string, number> = {};
    for (const o of orgs) {
      counts[o.vertical] = (counts[o.vertical] ?? 0) + 1;
    }
    return counts;
  }),
});
