import { describe, it, expect } from "vitest";
import { DEMO_ORG } from "@/lib/demo-history";
import { CATEGORY_META } from "@/components/timeline/timeline-meta";
import { formatUsdCompact } from "@/lib/utils";

describe("formatUsdCompact", () => {
  it("formats millions compactly", () => {
    expect(formatUsdCompact(6_240_000)).toBe("$6.2M");
  });
  it("formats thousands compactly", () => {
    expect(formatUsdCompact(410_000)).toBe("$410K");
  });
});

describe("DEMO_ORG history data", () => {
  it("has milestones in chronological order", () => {
    const years = DEMO_ORG.milestones.map((m) => m.year);
    const sorted = [...years].sort((a, b) => a - b);
    expect(years).toEqual(sorted);
  });

  it("references only known categories", () => {
    for (const m of DEMO_ORG.milestones) {
      expect(CATEGORY_META[m.category]).toBeDefined();
    }
  });

  it("has a revenue series spanning the life of the business", () => {
    const first = DEMO_ORG.revenueByYear[0];
    const last = DEMO_ORG.revenueByYear[DEMO_ORG.revenueByYear.length - 1];
    expect(first.year).toBeGreaterThanOrEqual(DEMO_ORG.founded);
    expect(last.revenue).toBeGreaterThan(first.revenue);
  });

  it("gives every milestone a unique id", () => {
    const ids = DEMO_ORG.milestones.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
