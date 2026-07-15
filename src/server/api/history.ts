/**
 * History tRPC router — the investor-facing "Life of the Business" timeline.
 * Milestones are partly machine-extracted (isManual=false) and partly entered
 * by the owner (isManual=true). The sparkline revenue series is derived from
 * the financials table.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { organizations, orgMilestones, financials } from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { dedupeFinancialsByYear } from "@/lib/financials";

const categoryEnum = z.enum([
  "founding", "financial", "equipment", "people",
  "customer", "operations", "compliance", "milestone",
]);

const milestoneInput = z.object({
  year: z.number().int().min(1800).max(2100),
  period: z.string().max(40).optional(),
  category: categoryEnum,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  metricLabel: z.string().max(60).optional(),
  metricValue: z.string().max(60).optional(),
  source: z.string().max(120).optional(),
});

export const historyRouter = router({
  /** Full timeline payload: org header, revenue series, and milestones. */
  timeline: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx.session;

    const [org, milestones, fins] = await Promise.all([
      ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
      ctx.db.select().from(orgMilestones).where(eq(orgMilestones.orgId, orgId)).orderBy(asc(orgMilestones.year)).all(),
      ctx.db.select().from(financials).where(eq(financials.orgId, orgId)).orderBy(asc(financials.year)).all(),
    ]);

    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      org: {
        name: org.name,
        vertical: org.vertical,
        location: org.location,
        founded: org.founded,
        employees: org.employeeCount,
      },
      revenueByYear: dedupeFinancialsByYear(fins)
        .filter((f) => f.revenue != null)
        .map((f) => ({ year: f.year, revenue: f.revenue as number })),
      milestones: milestones.map((m) => ({
        id: m.id,
        year: m.year,
        period: m.period ?? undefined,
        category: m.category as z.infer<typeof categoryEnum>,
        title: m.title,
        description: m.description,
        metric:
          m.metricLabel && m.metricValue
            ? { label: m.metricLabel, value: m.metricValue }
            : undefined,
        source: m.source ?? undefined,
        isManual: m.isManual,
      })),
    };
  }),

  /** Add a manual milestone. */
  create: protectedProcedure
    .input(milestoneInput)
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();
      await ctx.db.insert(orgMilestones).values({
        id,
        orgId: ctx.session.orgId,
        year: input.year,
        period: input.period,
        category: input.category,
        title: input.title,
        description: input.description,
        metricLabel: input.metricLabel,
        metricValue: input.metricValue,
        source: input.source ?? "Owner-provided",
        isManual: true,
      });
      return { id };
    }),

  /** Edit a milestone (manual or extracted). */
  update: protectedProcedure
    .input(milestoneInput.partial().extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await ctx.db
        .update(orgMilestones)
        .set(rest)
        .where(and(eq(orgMilestones.id, id), eq(orgMilestones.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  /** Delete a milestone. */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(orgMilestones)
        .where(and(eq(orgMilestones.id, input.id), eq(orgMilestones.orgId, ctx.session.orgId)));
      return { success: true };
    }),
});
