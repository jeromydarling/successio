import { describe, it, expect } from "vitest";
import { dedupeFinancialsByYear } from "@/lib/financials";

describe("dedupeFinancialsByYear", () => {
  it("collapses duplicate years, preferring the more complete row", () => {
    const rows = [
      { year: 2023, revenue: 5_000_000, grossProfit: null, ebitda: null, ownerCompensation: null },
      { year: 2023, revenue: 5_100_000, grossProfit: 1_800_000, ebitda: 700_000, ownerCompensation: null },
      { year: 2024, revenue: 6_000_000 },
    ];
    const out = dedupeFinancialsByYear(rows);
    expect(out).toHaveLength(2);
    expect(out[0].year).toBe(2023);
    expect(out[0].revenue).toBe(5_100_000); // the fuller row won
    expect(out[1].year).toBe(2024);
  });

  it("breaks completeness ties by most recently updated", () => {
    const older = { year: 2022, revenue: 1, updatedAt: new Date("2026-01-01") };
    const newer = { year: 2022, revenue: 2, updatedAt: new Date("2026-06-01") };
    expect(dedupeFinancialsByYear([older, newer])[0].revenue).toBe(2);
    expect(dedupeFinancialsByYear([newer, older])[0].revenue).toBe(2);
  });

  it("sorts output by year ascending and passes unique years through", () => {
    const out = dedupeFinancialsByYear([
      { year: 2024, revenue: 3 },
      { year: 2022, revenue: 1 },
      { year: 2023, revenue: 2 },
    ]);
    expect(out.map((r) => r.year)).toEqual([2022, 2023, 2024]);
  });

  it("handles empty input", () => {
    expect(dedupeFinancialsByYear([])).toEqual([]);
  });
});
