import { describe, it, expect } from "vitest";
import {
  conciergeIntakeSchema,
  canTransition,
  CONCIERGE_STATUSES,
  CONCIERGE_STATUS_META,
  PRICES,
} from "@/lib/concierge";

const valid = {
  name: "Carl Brenner",
  email: "carl@shop.com",
  businessName: "Brenner Precision",
  vertical: "manufacturing",
  timeline: "under_6mo",
  hasPaper: true,
  hasDigital: false,
  hasQuickbooks: false,
};

describe("concierge intake schema", () => {
  it("accepts a normal submission and defaults the checkboxes", () => {
    const r = conciergeIntakeSchema.safeParse({ ...valid, hasPaper: undefined });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hasPaper).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(conciergeIntakeSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });

  it("rejects unknown trades and timelines", () => {
    expect(conciergeIntakeSchema.safeParse({ ...valid, vertical: "crypto" }).success).toBe(false);
    expect(conciergeIntakeSchema.safeParse({ ...valid, timeline: "someday" }).success).toBe(false);
  });

  it("requires a real email and a name", () => {
    expect(conciergeIntakeSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(conciergeIntakeSchema.safeParse({ ...valid, name: "C" }).success).toBe(false);
  });
});

describe("status transitions", () => {
  it("moves forward freely and steps back exactly one", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("new", "delivered")).toBe(true);
    expect(canTransition("scheduled", "contacted")).toBe(true); // one step back
    expect(canTransition("in_progress", "new")).toBe(false); // too far back
  });
  it("allows declining from anywhere and is idempotent", () => {
    for (const s of CONCIERGE_STATUSES) {
      expect(canTransition(s, "declined")).toBe(true);
      expect(canTransition(s, s)).toBe(true);
    }
  });
  it("has owner-facing copy for every status", () => {
    for (const s of CONCIERGE_STATUSES) {
      expect(CONCIERGE_STATUS_META[s].ownerMessage.length).toBeGreaterThan(20);
    }
  });
});

describe("pricing model", () => {
  it("12 monthly payments cost a little more than paying once, for every tier", () => {
    for (const t of Object.values(PRICES)) {
      expect(t.monthly12 * 12).toBeGreaterThan(t.once);
      expect(t.monthly12 * 12).toBeLessThan(t.once * 1.25);
    }
  });
});
