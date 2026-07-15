import { describe, it, expect } from "vitest";
import { filterByTier } from "@/lib/share-tier";
import { checkE2eAuth } from "@/lib/e2e-admin";
import { orgTokenFromRecipient } from "@/server/workers/email-ingest";
import { timingSafeEqual } from "@/lib/timing-safe-equal";

const FULL_PROFILE = {
  executive_summary: "summary",
  business_overview: "overview",
  opportunity: "opportunity",
  customer_overview: "customers",
  financial_highlights: "financials",
  operations: "ops",
  team: "team",
  equipment_and_assets: "equipment",
  reason_for_sale: "reason",
  some_future_section: "unknown keys never leak",
};

describe("filterByTier", () => {
  it("public tier only exposes the teaser sections", () => {
    const out = filterByTier(FULL_PROFILE, "public");
    expect(Object.keys(out).sort()).toEqual(
      ["business_overview", "executive_summary", "opportunity"].sort()
    );
    expect(out.financial_highlights).toBeUndefined();
    expect(out.customer_overview).toBeUndefined();
  });

  it("nda/lender/buyer tiers expose the confidential set", () => {
    for (const tier of ["nda", "lender", "buyer"]) {
      const out = filterByTier(FULL_PROFILE, tier);
      expect(out.financial_highlights).toBe("financials");
      expect(out.reason_for_sale).toBe("reason");
    }
  });

  it("never passes through keys outside the whitelist", () => {
    for (const tier of ["public", "nda", "lender", "buyer"]) {
      expect(filterByTier(FULL_PROFILE, tier).some_future_section).toBeUndefined();
    }
  });

  it("fails closed to the public subset for unknown tiers", () => {
    const out = filterByTier(FULL_PROFILE, "totally-bogus");
    expect(out.financial_highlights).toBeUndefined();
    expect(out.executive_summary).toBe("summary");
  });
});

describe("checkE2eAuth", () => {
  it("fails closed when no env token is configured (no fallback token)", () => {
    const res = checkE2eAuth(undefined, "successio-e2e-purge-2026", "e2e+test@x.com");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
  });

  it("rejects a wrong token", () => {
    const res = checkE2eAuth("real-secret", "wrong", "e2e+test@x.com");
    expect(res.ok).toBe(false);
  });

  it("rejects non-e2e emails even with the right token", () => {
    const res = checkE2eAuth("real-secret", "real-secret", "victim@example.com");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it("accepts the right token + an e2e+ email", () => {
    expect(checkE2eAuth("real-secret", "real-secret", "e2e+journey@x.com").ok).toBe(true);
  });
});

describe("orgTokenFromRecipient", () => {
  it("extracts the org token from a plus-address, preserving case", () => {
    expect(orgTokenFromRecipient("docs+aBc123_-xY@successio.pro")).toBe("aBc123_-xY");
  });

  it("returns null when there is no plus token", () => {
    expect(orgTokenFromRecipient("docs@successio.pro")).toBeNull();
    expect(orgTokenFromRecipient("not-an-email")).toBeNull();
  });
});

describe("timingSafeEqual", () => {
  it("matches equal strings and rejects different ones", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });
});
