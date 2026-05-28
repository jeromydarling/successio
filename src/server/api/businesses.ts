import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import {
  organizations,
  readinessScores,
  readinessChecklist,
  customers,
  equipment,
  financials,
  employees,
  orgMilestones,
} from "@/db/schema";

export const businessesRouter = router({
  getOrg: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.session.orgId))
      .get();
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });
    return org;
  }),

  updateOrg: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        location: z.string().optional(),
        founded: z.number().int().min(1800).max(2030).optional(),
        employeeCount: z.number().int().positive().optional(),
        annualRevenue: z.number().positive().optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(organizations)
        .set({ ...input })
        .where(eq(organizations.id, ctx.session.orgId));
      return { success: true };
    }),

  latestScore: protectedProcedure.query(async ({ ctx }) => {
    const score = await ctx.db
      .select()
      .from(readinessScores)
      .where(eq(readinessScores.orgId, ctx.session.orgId))
      .orderBy(desc(readinessScores.createdAt))
      .limit(1)
      .get();
    return score ?? null;
  }),

  checklist: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(readinessChecklist)
      .where(eq(readinessChecklist.orgId, ctx.session.orgId))
      .all();
  }),

  customers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(customers)
      .where(eq(customers.orgId, ctx.session.orgId))
      .all();
  }),

  equipment: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(equipment)
      .where(eq(equipment.orgId, ctx.session.orgId))
      .all();
  }),

  financials: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(financials)
      .where(eq(financials.orgId, ctx.session.orgId))
      .orderBy(desc(financials.year))
      .all();
  }),

  employees: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(employees)
      .where(eq(employees.orgId, ctx.session.orgId))
      .all();
  }),

  milestones: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(orgMilestones)
      .where(eq(orgMilestones.orgId, ctx.session.orgId))
      .orderBy(orgMilestones.year)
      .all();
  }),
});
