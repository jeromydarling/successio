/**
 * Marketplace router. Buyer-facing reads are public but gated by
 * MARKETPLACE_ENABLED (or a superadmin preview cookie) — defense in depth on
 * top of the page-level 404. Seller-facing publish/pause are protected.
 *
 * Listings are BLIND: no business name, exact figures replaced by bands, and
 * only the public-tier profile sections. The path to the real thing is the
 * NDA-gated share token every listing carries.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, type Context } from "../trpc";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { filterByTier } from "@/lib/share-tier";
import { logSecurityEvent } from "@/lib/security-events";
import {
  isMarketplaceOpen,
  revenueBand,
  employeeBand,
  readinessBand,
  regionFromLocation,
  listingHeadline,
} from "@/lib/marketplace";

const { marketplaceListings, businessProfiles, organizations, financials, readinessScores, shareTokens } = schema;

async function gate(ctx: Context) {
  if (!(await isMarketplaceOpen(ctx.env, ctx.req.headers.get("cookie")))) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
}

const publicCols = {
  id: marketplaceListings.id,
  headline: marketplaceListings.headline,
  vertical: marketplaceListings.vertical,
  region: marketplaceListings.region,
  revenueBand: marketplaceListings.revenueBand,
  employeeBand: marketplaceListings.employeeBand,
  readinessBand: marketplaceListings.readinessBand,
  founded: marketplaceListings.founded,
  publishedAt: marketplaceListings.publishedAt,
};

export const marketplaceRouter = router({
  /** Browse live listings, with simple filters. */
  list: publicProcedure
    .input(
      z
        .object({
          vertical: z.string().optional(),
          region: z.string().optional(),
          revenueBand: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      await gate(ctx);
      const rows = await ctx.db
        .select(publicCols)
        .from(marketplaceListings)
        .where(eq(marketplaceListings.status, "live"))
        .orderBy(desc(marketplaceListings.publishedAt))
        .limit(100)
        .all();
      return rows.filter(
        (r) =>
          (!input?.vertical || r.vertical === input.vertical) &&
          (!input?.region || r.region.toLowerCase().includes(input.region.toLowerCase())) &&
          (!input?.revenueBand || r.revenueBand === input.revenueBand)
      );
    }),

  /** One listing: bands + teaser sections + the NDA token buyers proceed to. */
  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await gate(ctx);
    const row = await ctx.db
      .select({ ...publicCols, teaser: marketplaceListings.teaser, shareTokenId: marketplaceListings.shareTokenId })
      .from(marketplaceListings)
      .where(and(eq(marketplaceListings.id, input.id), eq(marketplaceListings.status, "live")))
      .get();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return { ...row, teaser: JSON.parse(row.teaser) as Record<string, string> };
  }),

  /** Seller: my listing (if any) and whether I'm eligible to publish one. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const [listing, profile] = await Promise.all([
      ctx.db.select().from(marketplaceListings).where(eq(marketplaceListings.orgId, orgId)).get(),
      ctx.db
        .select({ id: businessProfiles.id })
        .from(businessProfiles)
        .where(and(eq(businessProfiles.orgId, orgId), eq(businessProfiles.isDraft, false)))
        .orderBy(desc(businessProfiles.createdAt))
        .limit(1)
        .get(),
    ]);
    return {
      listing: listing
        ? {
            id: listing.id,
            status: listing.status,
            headline: listing.headline,
            region: listing.region,
            revenueBand: listing.revenueBand,
            employeeBand: listing.employeeBand,
            readinessBand: listing.readinessBand,
            publishedAt: listing.publishedAt,
            shareTokenId: listing.shareTokenId,
          }
        : null,
      canPublish: !!profile,
    };
  }),

  /** Seller: create or refresh the blind listing from the published profile. */
  publish: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const profile = await ctx.db
      .select()
      .from(businessProfiles)
      .where(and(eq(businessProfiles.orgId, orgId), eq(businessProfiles.isDraft, false)))
      .orderBy(desc(businessProfiles.createdAt))
      .limit(1)
      .get();
    if (!profile) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Publish your business profile first — the listing is built from it." });
    }
    const [org, latestFin, latestScore, existing] = await Promise.all([
      ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
      ctx.db.select({ revenue: financials.revenue }).from(financials).where(eq(financials.orgId, orgId)).orderBy(desc(financials.year)).limit(1).get(),
      ctx.db.select({ score: readinessScores.score }).from(readinessScores).where(eq(readinessScores.orgId, orgId)).orderBy(desc(readinessScores.createdAt)).limit(1).get(),
      ctx.db.select().from(marketplaceListings).where(eq(marketplaceListings.orgId, orgId)).get(),
    ]);
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    // Reuse the listing's NDA token if it still exists; otherwise mint one
    // with no expiry and no view cap — the listing is the long-lived door.
    let shareTokenId = existing?.shareTokenId ?? null;
    if (shareTokenId) {
      const tok = await ctx.db.select({ id: shareTokens.id }).from(shareTokens).where(eq(shareTokens.id, shareTokenId)).get();
      if (!tok) shareTokenId = null;
    }
    if (!shareTokenId) {
      shareTokenId = nanoid(12);
      await ctx.db.insert(shareTokens).values({
        id: shareTokenId,
        profileId: profile.id,
        orgId,
        tier: "nda",
        expiresAt: null,
        maxViews: null,
      });
      await logSecurityEvent(ctx.db, {
        type: "share_link_created",
        userId: ctx.session.sub,
        orgId,
        req: ctx.req,
        meta: { tier: "nda", marketplace: true },
      });
    }

    const content = JSON.parse(profile.content) as Record<string, string>;
    const region = regionFromLocation(org.location);
    const values = {
      profileId: profile.id,
      shareTokenId,
      headline: listingHeadline(org.vertical, region, org.founded),
      teaser: JSON.stringify(filterByTier(content, "public")),
      vertical: org.vertical,
      region,
      revenueBand: revenueBand(latestFin?.revenue ?? org.annualRevenue),
      employeeBand: employeeBand(org.employeeCount),
      readinessBand: readinessBand(latestScore?.score),
      founded: org.founded ?? null,
      status: "live" as const,
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      await ctx.db.update(marketplaceListings).set(values).where(eq(marketplaceListings.id, existing.id));
      return { id: existing.id, ...values };
    }
    const id = nanoid();
    await ctx.db.insert(marketplaceListings).values({ id, orgId, ...values });
    return { id, ...values };
  }),

  /** Seller: take the listing down (the NDA token stays valid for anyone
   *  already talking to them; revoke it from the Deal Room if needed). */
  pause: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(marketplaceListings)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(marketplaceListings.orgId, ctx.session.orgId));
    return { ok: true };
  }),
});
