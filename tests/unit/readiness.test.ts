import { describe, it, expect } from "vitest";
import { calculateReadiness } from "@/lib/readiness";

describe("calculateReadiness", () => {
  it("returns 0 when no signals are completed", () => {
    const { score } = calculateReadiness("manufacturing", [
      { category: "customers", completed: false, weight: 1 },
      { category: "financials", completed: false, weight: 1 },
    ]);
    expect(score).toBe(0);
  });

  it("returns 100 when all signals at full weight are complete", () => {
    const signals = (
      ["customers", "financials", "operations", "equipment", "people", "compliance"] as const
    ).map((cat) => ({ category: cat, completed: true, weight: 1 }));
    const { score } = calculateReadiness("manufacturing", signals);
    expect(score).toBe(100);
  });

  it("partial completion scales proportionally", () => {
    // Only financials complete (weight 1). Financials = 25% of manufacturing.
    const { score, breakdown } = calculateReadiness("manufacturing", [
      { category: "financials", completed: true, weight: 1 },
    ]);
    expect(breakdown.financials).toBe(100);
    expect(breakdown.customers).toBe(0);
    // Score should be ~25 (25% weight of 100-point financials)
    expect(score).toBeGreaterThan(20);
    expect(score).toBeLessThan(30);
  });

  it("falls back to manufacturing weights for unknown vertical", () => {
    const { score } = calculateReadiness("unknown_vertical", [
      { category: "financials", completed: true, weight: 1 },
    ]);
    expect(score).toBeGreaterThan(0);
  });

  it("breakdown categories always sum to ≤ 100 each", () => {
    const signals = [
      { category: "customers" as const, completed: true, weight: 0.5 },
      { category: "customers" as const, completed: true, weight: 0.6 },
    ];
    const { breakdown } = calculateReadiness("manufacturing", signals);
    expect(breakdown.customers).toBeLessThanOrEqual(100);
  });
});
