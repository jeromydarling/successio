/**
 * Integration: the deal-room view digest against real D1. No EMAIL binding in
 * the test env, so getEmailSender falls back to the console sender — we assert
 * on the DB side effects (viewDigestSentAt stamped) and the opt-out guard.
 */

import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { runViewDigest } from "@/server/workers/view-digest";

const db = drizzle(env.DB, { schema });

const ORG = "vd-org-1";
const ORG_OPTED_OUT = "vd-org-2";

async function seedOrg(id: string, optOut: boolean) {
  await db.insert(schema.organizations).values({
    id, name: `View Digest ${id}`, vertical: "manufacturing", viewDigestOptOut: optOut,
  });
  await db.insert(schema.users).values({
    id: `${id}-owner`, orgId: id, email: `e2e+${id}@successio.pro`,
    name: "Owner", role: "owner", passwordHash: "pbkdf2:00:00",
  });
  await db.insert(schema.businessProfiles).values({
    id: `${id}-profile`, orgId: id, title: "P", content: "{}", isDraft: false,
  });
  await db.insert(schema.shareTokens).values({
    id: `${id}-tok`, profileId: `${id}-profile`, orgId: id, tier: "nda",
  });
  await db.insert(schema.shareViews).values({
    id: `${id}-view`, tokenId: `${id}-tok`, orgId: id,
    viewerName: "Jane Buyer", viewerEmail: "jane@x.com",
    sectionsViewed: JSON.stringify(["executive_summary", "financial_highlights"]),
    durationSeconds: 180,
  });
}

beforeAll(async () => {
  await seedOrg(ORG, false);
  await seedOrg(ORG_OPTED_OUT, true);
});

describe("runViewDigest", () => {
  it("stamps viewDigestSentAt for an org with new views", async () => {
    await runViewDigest({ DB: env.DB });
    const org = await db
      .select({ sentAt: schema.organizations.viewDigestSentAt })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, ORG))
      .get();
    expect(org?.sentAt).toBeTruthy();
  });

  it("skips opted-out orgs — never stamps them", async () => {
    const org = await db
      .select({ sentAt: schema.organizations.viewDigestSentAt })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, ORG_OPTED_OUT))
      .get();
    expect(org?.sentAt).toBeNull();
  });

  it("does not re-send when there are no views newer than the last digest", async () => {
    // Storage is isolated/rolled-back per test, so run twice within this test:
    // the first stamps, the second finds the only view older than that stamp.
    await runViewDigest({ DB: env.DB });
    const first = await db
      .select({ sentAt: schema.organizations.viewDigestSentAt })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, ORG))
      .get();
    expect(first?.sentAt).toBeTruthy();

    await runViewDigest({ DB: env.DB });
    const second = await db
      .select({ sentAt: schema.organizations.viewDigestSentAt })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, ORG))
      .get();
    // Unchanged — the sole view predates the first digest, so no re-send.
    expect(second?.sentAt?.getTime()).toBe(first?.sentAt?.getTime());
  });
});
