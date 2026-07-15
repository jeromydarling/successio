import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure, type Context } from "../trpc";
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
import { nanoid } from "@/lib/nanoid";
import { recalculateScore } from "@/server/workers/score";

/** Manual entries change the entity counts the readiness score is built from,
 *  so every save/delete refreshes the score — same as a document extraction. */
async function refreshScore(ctx: Context & { session: NonNullable<Context["session"]> }) {
  try {
    const org = await ctx.db
      .select({ vertical: organizations.vertical })
      .from(organizations)
      .where(eq(organizations.id, ctx.session.orgId))
      .get();
    await recalculateScore({
      orgId: ctx.session.orgId,
      vertical: org?.vertical ?? "manufacturing",
      env: { DB: ctx.env.DB, PROCESSING_STATE: ctx.env.PROCESSING_STATE },
    });
  } catch (err) {
    // Score refresh is best-effort — the entity write itself already landed.
    console.error("[businesses] score refresh failed:", err);
  }
}

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

  // ── Manual entity entry — for the things AI extraction missed ─────────────
  // Each save is an upsert (id present → update, absent → create) and every
  // write is org-scoped so a user can never touch another org's rows.

  saveCustomer: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(200),
        revenueShare: z.number().min(0).max(1).nullish(),
        contractStatus: z.enum(["active", "expired", "month-to-month"]).nullish(),
        notes: z.string().max(2000).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...fields } = input;
      if (id) {
        await ctx.db
          .update(customers)
          .set(fields)
          .where(and(eq(customers.id, id), eq(customers.orgId, ctx.session.orgId)));
      } else {
        await ctx.db.insert(customers).values({ id: nanoid(), orgId: ctx.session.orgId, ...fields });
      }
      await refreshScore(ctx);
      return { success: true };
    }),

  deleteCustomer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(customers)
        .where(and(eq(customers.id, input.id), eq(customers.orgId, ctx.session.orgId)));
      await refreshScore(ctx);
      return { success: true };
    }),

  saveEquipment: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(200),
        manufacturer: z.string().max(200).nullish(),
        model: z.string().max(200).nullish(),
        yearInstalled: z.number().int().min(1900).max(2100).nullish(),
        condition: z.enum(["excellent", "good", "fair", "poor"]).nullish(),
        estimatedValue: z.number().min(0).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...fields } = input;
      if (id) {
        await ctx.db
          .update(equipment)
          .set(fields)
          .where(and(eq(equipment.id, id), eq(equipment.orgId, ctx.session.orgId)));
      } else {
        await ctx.db.insert(equipment).values({ id: nanoid(), orgId: ctx.session.orgId, ...fields });
      }
      await refreshScore(ctx);
      return { success: true };
    }),

  deleteEquipment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(equipment)
        .where(and(eq(equipment.id, input.id), eq(equipment.orgId, ctx.session.orgId)));
      await refreshScore(ctx);
      return { success: true };
    }),

  saveEmployee: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(200),
        role: z.string().trim().min(1).max(200),
        tenureYears: z.number().min(0).max(80).nullish(),
        isKeyPerson: z.boolean().nullish(),
        notes: z.string().max(2000).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...fields } = input;
      if (id) {
        await ctx.db
          .update(employees)
          .set(fields)
          .where(and(eq(employees.id, id), eq(employees.orgId, ctx.session.orgId)));
      } else {
        await ctx.db.insert(employees).values({ id: nanoid(), orgId: ctx.session.orgId, ...fields });
      }
      await refreshScore(ctx);
      return { success: true };
    }),

  deleteEmployee: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(employees)
        .where(and(eq(employees.id, input.id), eq(employees.orgId, ctx.session.orgId)));
      await refreshScore(ctx);
      return { success: true };
    }),

  saveFinancial: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        year: z.number().int().min(1980).max(2100),
        revenue: z.number().min(0).nullish(),
        grossProfit: z.number().nullish(),
        ebitda: z.number().nullish(),
        ownerCompensation: z.number().min(0).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...fields } = input;
      if (id) {
        await ctx.db
          .update(financials)
          .set(fields)
          .where(and(eq(financials.id, id), eq(financials.orgId, ctx.session.orgId)));
      } else {
        await ctx.db.insert(financials).values({ id: nanoid(), orgId: ctx.session.orgId, ...fields });
      }
      await refreshScore(ctx);
      return { success: true };
    }),

  deleteFinancial: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(financials)
        .where(and(eq(financials.id, input.id), eq(financials.orgId, ctx.session.orgId)));
      await refreshScore(ctx);
      return { success: true };
    }),
});
