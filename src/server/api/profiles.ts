/**
 * Profiles tRPC router — Phase 5 Deal Room.
 * Generates the business profile via Claude Opus, manages share tokens,
 * and exposes the access audit log.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import {
  organizations,
  businessProfiles,
  shareTokens,
  shareViews,
  customers,
  financials,
  employees,
  processes,
  equipment,
} from "@/db/schema";
import { makeGateway, MODELS } from "@/lib/ai-gateway";
import { extractJson } from "@/lib/json";
import { buildProfilePrompt } from "@/prompts/manufacturing/profile";
import { renderProfilePdf } from "@/lib/pdf";
import { nanoid } from "@/lib/nanoid";

const SECTION_LABELS: Record<string, string> = {
  executive_summary:    "Executive Summary",
  business_overview:    "Business Overview",
  customer_overview:    "Customer Overview",
  financial_highlights: "Financial Highlights",
  operations:           "Operations",
  team:                 "Team & People",
  equipment_and_assets: "Equipment & Assets",
  opportunity:          "The Opportunity",
  reason_for_sale:      "Reason for Sale",
};
const SECTION_ORDER = Object.keys(SECTION_LABELS);

// Short, URL-safe share token (12 chars is enough entropy for this use case)
function shareToken() {
  return nanoid(12);
}

const profileContentSchema = z.object({
  executive_summary:    z.string(),
  business_overview:    z.string(),
  customer_overview:    z.string(),
  financial_highlights: z.string(),
  operations:           z.string(),
  team:                 z.string(),
  equipment_and_assets: z.string(),
  opportunity:          z.string(),
  reason_for_sale:      z.string(),
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

export const profilesRouter = router({
  /** Generate (or regenerate) the business profile via Claude Opus. */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId } = ctx.session;

    // Gather all org data for the prompt
    const [org, custs, fins, emps, procs, equips] = await Promise.all([
      ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
      ctx.db.select().from(customers).where(eq(customers.orgId, orgId)).all(),
      ctx.db.select().from(financials).where(eq(financials.orgId, orgId)).orderBy(financials.year).all(),
      ctx.db.select().from(employees).where(eq(employees.orgId, orgId)).all(),
      ctx.db.select().from(processes).where(eq(processes.orgId, orgId)).all(),
      ctx.db.select().from(equipment).where(eq(equipment.orgId, orgId)).all(),
    ]);

    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    const gateway = makeGateway(ctx.env as any);
    const prompt = buildProfilePrompt({
      org,
      customers: custs.map(c => ({ name: c.name, revenueShare: c.revenueShare, contractStatus: c.contractStatus })),
      financials: fins.map(f => ({ year: f.year, revenue: f.revenue, grossProfit: f.grossProfit, ebitda: f.ebitda, ownerCompensation: f.ownerCompensation })),
      employees: emps.map(e => ({ name: e.name, role: e.role, tenureYears: e.tenureYears, isKeyPerson: e.isKeyPerson ?? false })),
      processes: procs.map(p => ({ title: p.title, steps: p.steps })),
      equipment: equips.map(e => ({ name: e.name, manufacturer: e.manufacturer, yearInstalled: e.yearInstalled, estimatedValue: e.estimatedValue })),
    });

    const result = await gateway.complete({
      model: MODELS.profile_draft,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      temperature: 0.3,
    });

    const content = profileContentSchema.parse(JSON.parse(extractJson(result.content)));

    // Upsert profile (one per org for MVP)
    const existing = await ctx.db
      .select({ id: businessProfiles.id })
      .from(businessProfiles)
      .where(eq(businessProfiles.orgId, orgId))
      .orderBy(desc(businessProfiles.createdAt))
      .limit(1)
      .get();

    if (existing) {
      await ctx.db
        .update(businessProfiles)
        .set({ content: JSON.stringify(content), isDraft: false })
        .where(eq(businessProfiles.id, existing.id));
      return { profileId: existing.id, content };
    }

    const profileId = nanoid();
    await ctx.db.insert(businessProfiles).values({
      id: profileId,
      orgId,
      title: `${org.name} — Business Profile`,
      content: JSON.stringify(content),
      isDraft: false,
    });
    return { profileId, content };
  }),

  /** Return the latest generated profile for this org. */
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.orgId, ctx.session.orgId))
      .orderBy(desc(businessProfiles.createdAt))
      .limit(1)
      .get();

    if (!profile) return null;

    const content = (() => {
      try { return profileContentSchema.parse(JSON.parse(profile.content)); } catch { return null; }
    })();

    return { ...profile, content };
  }),

  /** Render the latest profile to a PDF, store it in R2, return a download URL. */
  exportPdf: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId } = ctx.session;

    const [profile, org] = await Promise.all([
      ctx.db.select().from(businessProfiles).where(eq(businessProfiles.orgId, orgId)).orderBy(desc(businessProfiles.createdAt)).limit(1).get(),
      ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
    ]);

    if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Generate a profile first" });

    let content: Record<string, string> = {};
    try { content = JSON.parse(profile.content); } catch { /* empty */ }

    const sections = SECTION_ORDER
      .filter((k) => content[k]?.trim())
      .map((k) => ({ heading: SECTION_LABELS[k], body: content[k] }));

    const subtitle = [org?.vertical, org?.location, org?.founded && `Established ${org.founded}`]
      .filter(Boolean)
      .join("  ·  ");

    const bytes = renderProfilePdf({
      orgName: org?.name ?? profile.title,
      subtitle,
      sections,
    });

    // Store in R2 and hand back a presigned GET URL.
    const r2Key = `profiles/${orgId}/${profile.id}.pdf`;
    await ctx.env.DOCUMENTS.put(r2Key, bytes, {
      httpMetadata: { contentType: "application/pdf" },
    });
    await ctx.db.update(businessProfiles).set({ pdfR2Key: r2Key }).where(eq(businessProfiles.id, profile.id));

    // The bytes are served by GET /api/profile-pdf (streamed from R2 via the
    // binding) — no presigned URL / S3 credentials needed.
    return { ready: true };
  }),

  /** Create or retrieve a share token for a given tier. */
  getShareToken: protectedProcedure
    .input(z.object({ tier: z.enum(["public", "nda", "lender", "buyer"]) }))
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      // Need a profile to attach the token to
      const profile = await ctx.db
        .select({ id: businessProfiles.id })
        .from(businessProfiles)
        .where(eq(businessProfiles.orgId, orgId))
        .orderBy(desc(businessProfiles.createdAt))
        .limit(1)
        .get();

      if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Generate a profile first" });

      // Return existing token for this tier if one exists
      const existing = await ctx.db
        .select()
        .from(shareTokens)
        .where(and(
          eq(shareTokens.profileId, profile.id),
          eq(shareTokens.tier, input.tier)
        ))
        .limit(1)
        .get();

      if (existing) return { token: existing.id, tier: input.tier };

      const token = shareToken();
      await ctx.db.insert(shareTokens).values({
        id: token,
        profileId: profile.id,
        orgId,
        tier: input.tier,
      });

      return { token, tier: input.tier };
    }),

  /** All share tokens for this org's profile. */
  listShareTokens: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db
      .select({ id: businessProfiles.id })
      .from(businessProfiles)
      .where(eq(businessProfiles.orgId, ctx.session.orgId))
      .orderBy(desc(businessProfiles.createdAt))
      .limit(1)
      .get();

    if (!profile) return [];

    return ctx.db
      .select()
      .from(shareTokens)
      .where(eq(shareTokens.profileId, profile.id))
      .all();
  }),

  /** Access audit log for this org's share tokens. */
  listViews: protectedProcedure.query(async ({ ctx }) => {
    const tokens = await ctx.db
      .select({ id: shareTokens.id })
      .from(shareTokens)
      .where(eq(shareTokens.orgId, ctx.session.orgId))
      .all();

    if (tokens.length === 0) return [];

    const tokenIds = tokens.map((t) => t.id);

    return ctx.db
      .select()
      .from(shareViews)
      .where(inArray(shareViews.tokenId, tokenIds))
      .orderBy(desc(shareViews.createdAt))
      .limit(50)
      .all();
  }),

  /** Revoke a share token (delete it). */
  revokeToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(shareTokens)
        .where(and(
          eq(shareTokens.id, input.token),
          eq(shareTokens.orgId, ctx.session.orgId)
        ));
      return { success: true };
    }),
});
