import { describe, it, expect } from "vitest";
import { auditProfileNumbers, type AuditSource } from "@/lib/profile-audit";

const SRC: AuditSource = {
  financials: [
    { year: 2023, revenue: 4_200_000, grossProfit: 1_500_000, ebitda: 630_000 },
    { year: 2024, revenue: 5_000_000, grossProfit: 1_800_000, ebitda: 750_000 },
  ],
  customers: [{ revenueShare: 0.25 }, { revenueShare: 0.1 }],
  equipment: [{ estimatedValue: 85_000 }, { estimatedValue: 365_000 }],
  org: { annualRevenue: 5_000_000, employeeCount: 31, founded: 1987 },
};

describe("auditProfileNumbers", () => {
  it("passes figures that trace to source records", () => {
    const content = {
      financial_highlights:
        "Revenue grew from $4.2M in 2023 to $5,000,000 in 2024, a 19% increase. Gross margin held at 36%.",
      equipment_and_assets: "Approximately $450k of equipment, including a $365,000 CNC cell.",
      customer_overview: "The largest customer represents 25% of revenue.",
    };
    expect(auditProfileNumbers(content, SRC)).toEqual([]);
  });

  it("flags invented dollar figures", () => {
    const content = {
      financial_highlights: "Revenue reached $7.5M last year.",
    };
    const issues = auditProfileNumbers(content, SRC);
    expect(issues).toHaveLength(1);
    expect(issues[0].figure).toContain("$7.5M");
    expect(issues[0].section).toBe("financial_highlights");
  });

  it("flags invented percentages", () => {
    const content = { customer_overview: "The top customer accounts for 60% of revenue." };
    const issues = auditProfileNumbers(content, SRC);
    expect(issues.some((i) => i.figure.includes("60"))).toBe(true);
  });

  it("does not flag years or plain counts (no $ or % sign)", () => {
    const content = {
      business_overview: "Founded in 1987, the company employs 31 people across 2 shifts.",
    };
    expect(auditProfileNumbers(content, SRC)).toEqual([]);
  });

  it("tolerates rounded narrative forms of real numbers", () => {
    const content = {
      financial_highlights: "EBITDA of roughly $750,000 on $5 million in revenue (15% margin).",
    };
    expect(auditProfileNumbers(content, SRC)).toEqual([]);
  });

  it("handles empty sources by flagging every figure", () => {
    const empty: AuditSource = { financials: [], customers: [], equipment: [], org: {} };
    const issues = auditProfileNumbers({ a: "Revenue of $1.2M and 40% growth." }, empty);
    expect(issues).toHaveLength(2);
  });
});
