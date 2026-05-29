/**
 * Legacy Book router — synthesizes "The Story of Your Business".
 * Owners generate it for their own business; association admins can generate
 * (preview/gift) it for any member of their association.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";
import { router, protectedProcedure } from "../trpc";
import {
  organizations, users, customers, financials, employees, processes, orgMilestones, businessProfiles,
} from "@/db/schema";
import { makeGateway, MODELS } from "@/lib/ai-gateway";
import { extractJson } from "@/lib/json";
import { LEGACY_SYSTEM, buildLegacyBookPrompt } from "@/prompts/shared/legacy-book";

const bookSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().default(""),
  dedication: z.string().optional().default(""),
  chapters: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
  byTheNumbers: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  closing: z.string().optional().default(""),
});

export type LegacyBook = z.infer<typeof bookSchema>;

type DB = DrizzleD1Database<typeof schema>;

/** Resolve the target org id: own org, or a member org for an association admin. */
async function resolveOrgId(
  ctx: { db: DB; session: { sub: string; orgId: string } },
  requestedOrgId?: string
): Promise<string> {
  if (!requestedOrgId || requestedOrgId === ctx.session.orgId) return ctx.session.orgId;

  // Requesting another org — only allowed for the association_admin who owns it.
  const me = await ctx.db
    .select({ role: users.role, associationId: users.associationId })
    .from(users)
    .where(eq(users.id, ctx.session.sub))
    .get();
  if (me?.role !== "association_admin" || !me.associationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  const org = await ctx.db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.id, requestedOrgId), eq(organizations.associationId, me.associationId)))
    .get();
  if (!org) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of your association" });
  return requestedOrgId;
}

export const legacyRouter = router({
  /** Generate the legacy book content (preview). */
  generate: protectedProcedure
    .input(z.object({ orgId: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const orgId = await resolveOrgId(ctx, input?.orgId);

      const [org, miles, fins, emps, custs, procs, profile] = await Promise.all([
        ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
        ctx.db.select().from(orgMilestones).where(eq(orgMilestones.orgId, orgId)).orderBy(asc(orgMilestones.year)).all(),
        ctx.db.select().from(financials).where(eq(financials.orgId, orgId)).orderBy(asc(financials.year)).all(),
        ctx.db.select().from(employees).where(eq(employees.orgId, orgId)).all(),
        ctx.db.select().from(customers).where(eq(customers.orgId, orgId)).all(),
        ctx.db.select().from(processes).where(eq(processes.orgId, orgId)).all(),
        ctx.db.select().from(businessProfiles).where(eq(businessProfiles.orgId, orgId)).get(),
      ]);

      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      let profileContent: Record<string, string> | null = null;
      if (profile) { try { profileContent = JSON.parse(profile.content); } catch { /* ignore */ } }

      const gateway = makeGateway(ctx.env as never);
      const prompt = buildLegacyBookPrompt({
        org: { name: org.name, vertical: org.vertical, location: org.location, founded: org.founded, employeeCount: org.employeeCount },
        milestones: miles.map((m) => ({ year: m.year, category: m.category, title: m.title, description: m.description, metricLabel: m.metricLabel, metricValue: m.metricValue })),
        financials: fins.map((f) => ({ year: f.year, revenue: f.revenue, grossProfit: f.grossProfit, ebitda: f.ebitda })),
        employees: emps.map((e) => ({ name: e.name, role: e.role, tenureYears: e.tenureYears, isKeyPerson: e.isKeyPerson ?? false })),
        customers: custs.map((c) => ({ name: c.name, revenueShare: c.revenueShare, contractStatus: c.contractStatus })),
        processes: procs.map((p) => ({ title: p.title })),
        profile: profileContent,
      });

      const result = await gateway.complete({
        model: MODELS.profile_draft,
        messages: [
          { role: "system", content: LEGACY_SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 6000,
        temperature: 0.4,
      });

      let book: LegacyBook;
      try {
        book = bookSchema.parse(JSON.parse(extractJson(result.content)));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not compose the book — try again." });
      }

      const hasData = miles.length + fins.length + emps.length + custs.length > 0;
      return { book, orgName: org.name, hasData };
    }),
});
