/**
 * Association admin router — the multi-tenant portal.
 *
 * An association_admin belongs to exactly one association (users.associationId).
 * Every query here is scoped to that association's member businesses
 * (organizations.associationId), so one shared deployment serves many
 * associations without cross-tenant leakage.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, count, desc, asc, gte, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import {
  organizations, users, associations, associationInvites,
  readinessScores, readinessChecklist, documents, orgMilestones,
} from "@/db/schema";
import { signSession, makeSessionCookie } from "@/lib/auth";
import { nanoid } from "@/lib/nanoid";

type DB = DrizzleD1Database<typeof schema>;

const verticalEnum = z.enum([
  "manufacturing", "hvac", "plumbing", "electrical", "construction", "trucking", "agriculture",
]);

/** Requires association_admin role + a linked association; attaches associationId. */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.db
    .select({ role: users.role, associationId: users.associationId })
    .from(users)
    .where(eq(users.id, ctx.session.sub))
    .get();

  if (!user || user.role !== "association_admin" || !user.associationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Association admin access required" });
  }
  return next({ ctx: { ...ctx, associationId: user.associationId } });
});

/** Latest readiness score per org id. */
async function latestScores(db: DB, orgIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orgIds.length === 0) return map;
  const rows = await db
    .select({ orgId: readinessScores.orgId, score: readinessScores.score })
    .from(readinessScores)
    .where(inArray(readinessScores.orgId, orgIds))
    .orderBy(desc(readinessScores.createdAt))
    .all();
  for (const r of rows) if (!map.has(r.orgId)) map.set(r.orgId, r.score);
  return map;
}

export const adminRouter = router({
  /** Public: resolve an invite token so the signup page can prefill + link. */
  inviteInfo: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      const invite = await ctx.db
        .select({
          businessName: associationInvites.businessName,
          vertical: associationInvites.vertical,
          status: associationInvites.status,
          associationId: associationInvites.associationId,
        })
        .from(associationInvites)
        .where(eq(associationInvites.token, input.token))
        .get();
      if (!invite || invite.status !== "pending") return null;
      const assoc = await ctx.db
        .select({ name: associations.name })
        .from(associations)
        .where(eq(associations.id, invite.associationId))
        .get();
      return {
        businessName: invite.businessName,
        vertical: invite.vertical,
        associationName: assoc?.name ?? null,
      };
    }),

  /** What association (if any) the current user administers — drives onboarding. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .select({ role: users.role, associationId: users.associationId })
      .from(users)
      .where(eq(users.id, ctx.session.sub))
      .get();
    if (!user?.associationId) return { role: user?.role ?? "owner", association: null };
    const assoc = await ctx.db
      .select()
      .from(associations)
      .where(eq(associations.id, user.associationId))
      .get();
    return { role: user.role, association: assoc ?? null };
  }),

  /** Create an association and make the current user its admin (charter onboarding). */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(120),
      website: z.string().url().optional(),
      primaryColor: z.string().max(9).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();
      const slug =
        input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) +
        "-" + nanoid(4).toLowerCase();

      await ctx.db.insert(associations).values({
        id, name: input.name, slug,
        website: input.website, primaryColor: input.primaryColor,
      });
      await ctx.db
        .update(users)
        .set({ role: "association_admin", associationId: id })
        .where(eq(users.id, ctx.session.sub));

      // Re-issue the session so the JWT role matches the new DB role immediately.
      const token = await signSession(
        { sub: ctx.session.sub, orgId: ctx.session.orgId, email: ctx.session.email, role: "association_admin" },
        ctx.env.JWT_SECRET
      );
      const cookie = makeSessionCookie(token, ctx.env.ENVIRONMENT === "production");
      ctx.resHeaders.append("Set-Cookie", cookie);
      return { associationId: id, slug, cookie };
    }),

  /** Scoped overview: member count, average readiness, lift, recent activity. */
  overview: adminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.associationId, ctx.associationId))
      .all();
    const orgIds = orgs.map((o) => o.id);

    const invitePending = await ctx.db
      .select({ n: count() })
      .from(associationInvites)
      .where(and(eq(associationInvites.associationId, ctx.associationId), eq(associationInvites.status, "pending")))
      .get();

    if (orgIds.length === 0) {
      return { memberCount: 0, pendingInvites: invitePending?.n ?? 0, avgScore: 0, lift: 0, recentDocs: 0 };
    }

    const scores = await latestScores(ctx.db, orgIds);
    const vals = [...scores.values()];
    const avgScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

    // Lift: avg(latest − earliest) across members.
    const allScores = await ctx.db
      .select({ orgId: readinessScores.orgId, score: readinessScores.score })
      .from(readinessScores)
      .where(inArray(readinessScores.orgId, orgIds))
      .orderBy(asc(readinessScores.createdAt))
      .all();
    const firstByOrg = new Map<string, number>();
    const lastByOrg = new Map<string, number>();
    for (const r of allScores) {
      if (!firstByOrg.has(r.orgId)) firstByOrg.set(r.orgId, r.score);
      lastByOrg.set(r.orgId, r.score);
    }
    const deltas = [...firstByOrg.keys()].map((id) => (lastByOrg.get(id) ?? 0) - (firstByOrg.get(id) ?? 0));
    const lift = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDocs = await ctx.db
      .select({ n: count() })
      .from(documents)
      .where(and(inArray(documents.orgId, orgIds), gte(documents.createdAt, thirtyDaysAgo)))
      .get();

    return {
      memberCount: orgIds.length,
      pendingInvites: invitePending?.n ?? 0,
      avgScore,
      lift,
      recentDocs: recentDocs?.n ?? 0,
    };
  }),

  /** Roster of member businesses with latest score + doc count. */
  members: adminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.associationId, ctx.associationId))
      .orderBy(desc(organizations.createdAt))
      .all();
    const orgIds = orgs.map((o) => o.id);
    const scores = await latestScores(ctx.db, orgIds);

    const docCounts = await Promise.all(
      orgs.map((o) =>
        ctx.db.select({ n: count() }).from(documents).where(eq(documents.orgId, o.id)).get()
      )
    );

    return orgs.map((o, i) => ({
      id: o.id, name: o.name, vertical: o.vertical, location: o.location,
      latestScore: scores.get(o.id) ?? null,
      docCount: docCounts[i]?.n ?? 0,
    }));
  }),

  /** Readiness report: distribution, at-risk members, vertical breakdown. */
  report: adminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db
      .select({ id: organizations.id, name: organizations.name, vertical: organizations.vertical })
      .from(organizations)
      .where(eq(organizations.associationId, ctx.associationId))
      .all();
    const orgIds = orgs.map((o) => o.id);
    const scores = await latestScores(ctx.db, orgIds);

    const distribution = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
    const atRisk: { id: string; name: string; vertical: string; score: number | null }[] = [];
    const verticalCounts: Record<string, number> = {};

    for (const o of orgs) {
      verticalCounts[o.vertical] = (verticalCounts[o.vertical] ?? 0) + 1;
      const v = scores.get(o.id) ?? null;
      if (v === null || v < 40) atRisk.push({ id: o.id, name: o.name, vertical: o.vertical, score: v });
      if (v !== null) {
        if (v <= 20) distribution["0–20"]++;
        else if (v <= 40) distribution["21–40"]++;
        else if (v <= 60) distribution["41–60"]++;
        else if (v <= 80) distribution["61–80"]++;
        else distribution["81–100"]++;
      }
    }

    return { distribution, atRisk, verticalCounts, total: orgs.length };
  }),

  /** Create invites for a batch of members (roster import). */
  importMembers: adminProcedure
    .input(z.object({
      members: z.array(z.object({
        businessName: z.string().min(1).max(200),
        contactEmail: z.string().email(),
        vertical: verticalEnum,
      })).min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const created = input.members.map((m) => ({
        id: nanoid(),
        associationId: ctx.associationId,
        businessName: m.businessName,
        contactEmail: m.contactEmail.toLowerCase(),
        vertical: m.vertical,
        token: nanoid(16),
        status: "pending" as const,
      }));
      await ctx.db.insert(associationInvites).values(created);
      return created.map((c) => ({ id: c.id, businessName: c.businessName, token: c.token }));
    }),

  /** All invites for this association. */
  listInvites: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(associationInvites)
      .where(eq(associationInvites.associationId, ctx.associationId))
      .orderBy(desc(associationInvites.createdAt))
      .all();
  }),

  revokeInvite: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(associationInvites)
        .where(and(eq(associationInvites.id, input.id), eq(associationInvites.associationId, ctx.associationId)));
      return { success: true };
    }),

  /** Drill into a single member: timeline, score history, docs, gaps. */
  memberDetail: adminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      const org = await ctx.db
        .select()
        .from(organizations)
        .where(and(eq(organizations.id, input.orgId), eq(organizations.associationId, ctx.associationId)))
        .get();
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const [scoreHistory, milestones, docs, checklist] = await Promise.all([
        ctx.db.select({ score: readinessScores.score, createdAt: readinessScores.createdAt })
          .from(readinessScores).where(eq(readinessScores.orgId, input.orgId))
          .orderBy(asc(readinessScores.createdAt)).all(),
        ctx.db.select().from(orgMilestones).where(eq(orgMilestones.orgId, input.orgId))
          .orderBy(asc(orgMilestones.year)).all(),
        ctx.db.select({ id: documents.id, originalName: documents.originalName, status: documents.status, createdAt: documents.createdAt })
          .from(documents).where(eq(documents.orgId, input.orgId))
          .orderBy(desc(documents.createdAt)).limit(50).all(),
        ctx.db.select().from(readinessChecklist).where(eq(readinessChecklist.orgId, input.orgId)).all(),
      ]);

      return { org, scoreHistory, milestones, docs, checklist };
    }),
});
