/**
 * Organization history model — the data that powers the investor-facing
 * "Life of the Business" timeline. In production these records are derived
 * from extracted_entities + manual milestones (see /src/db/schema.ts) and
 * served per-organization. This file is the demo dataset.
 */

export type MilestoneCategory =
  | "founding"
  | "financial"
  | "equipment"
  | "people"
  | "customer"
  | "operations"
  | "compliance"
  | "milestone";

export interface OrgMilestone {
  id: string;
  year: number;
  /** Optional finer-grained label, e.g. "Q3" or "Spring". */
  period?: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  /** Optional headline metric surfaced as a chip on the card. */
  metric?: { label: string; value: string };
  /** Where this fact came from — builds buyer trust. */
  source?: string;
}

export interface OrgProfile {
  name: string;
  vertical: string;
  location: string;
  founded: number;
  employees: number;
  /** Annual revenue history for the spark line, oldest → newest. */
  revenueByYear: { year: number; revenue: number }[];
  milestones: OrgMilestone[];
}

export const DEMO_ORG: OrgProfile = {
  name: "Brenner Precision Machining",
  vertical: "Machine Shop / Manufacturing",
  location: "Akron, Ohio",
  founded: 1987,
  employees: 31,
  revenueByYear: [
    { year: 1990, revenue: 410_000 },
    { year: 1995, revenue: 980_000 },
    { year: 2000, revenue: 1_640_000 },
    { year: 2005, revenue: 2_310_000 },
    { year: 2010, revenue: 2_050_000 },
    { year: 2015, revenue: 3_480_000 },
    { year: 2020, revenue: 4_120_000 },
    { year: 2023, revenue: 5_390_000 },
    { year: 2025, revenue: 6_240_000 },
  ],
  milestones: [
    {
      id: "m-1987",
      year: 1987,
      category: "founding",
      title: "Carl Brenner opens the doors",
      description:
        "Started in a rented 2,400 sq ft bay with one manual Bridgeport mill and a used surface grinder. First job: replacement bushings for a local conveyor outfit.",
      metric: { label: "Starting machines", value: "2" },
      source: "Founder interview",
    },
    {
      id: "m-1991",
      year: 1991,
      category: "equipment",
      title: "First CNC lathe",
      description:
        "Financed a Mazak QuickTurn — the shop's first CNC. Cut cycle times on repeat work by more than half and opened the door to tighter tolerances.",
      metric: { label: "Tolerance", value: "±0.0005\"" },
      source: "Equipment ledger",
    },
    {
      id: "m-1996",
      year: 1996,
      category: "customer",
      title: "Landed the Goodyear tooling contract",
      description:
        "A multi-year supply agreement for mold components. Became the anchor account that funded the move to a larger building.",
      metric: { label: "Anchor revenue", value: "32% of book" },
      source: "Contract records",
    },
    {
      id: "m-1998",
      year: 1998,
      category: "milestone",
      title: "Moved to the Kelly Ave shop",
      description:
        "Purchased a 14,000 sq ft building. Owned real estate that conveys with the business — a meaningful piece of the enterprise value.",
      metric: { label: "Facility", value: "14,000 sq ft" },
      source: "Property deed",
    },
    {
      id: "m-2003",
      year: 2003,
      category: "compliance",
      title: "ISO 9001 certified",
      description:
        "Stood up a documented quality system. Unlocked aerospace and medical RFQs that require certified suppliers.",
      metric: { label: "Standard", value: "ISO 9001:2000" },
      source: "Certificate on file",
    },
    {
      id: "m-2008",
      year: 2008,
      category: "financial",
      title: "Weathered the downturn",
      description:
        "Revenue dipped 18% but the shop stayed cash-flow positive by diversifying into defense subcontracting. No layoffs — a point of pride that retained the core crew.",
      metric: { label: "Headcount kept", value: "100%" },
      source: "P&L 2007–2010",
    },
    {
      id: "m-2012",
      year: 2012,
      category: "people",
      title: "Maria Vasquez promoted to Shop Manager",
      description:
        "A 15-year machinist took over scheduling and the floor. The first real layer of management between the owner and the work — reduces key-person risk for a buyer.",
      metric: { label: "Tenure", value: "15 yrs" },
      source: "HR records",
    },
    {
      id: "m-2016",
      year: 2016,
      category: "equipment",
      title: "5-axis machining cell",
      description:
        "Added a DMG MORI 5-axis center and probing. Brought complex aerospace bracketry in-house that used to be outsourced.",
      metric: { label: "Capex", value: "$480K" },
      source: "Equipment ledger",
    },
    {
      id: "m-2019",
      year: 2019,
      category: "operations",
      title: "ERP + paperless travelers",
      description:
        "Replaced the whiteboard and job folders with a real shop-floor system. Quote-to-cash and job costing are now traceable — exactly what diligence asks for.",
      metric: { label: "On-time delivery", value: "97.4%" },
      source: "ERP export",
    },
    {
      id: "m-2022",
      year: 2022,
      category: "customer",
      title: "Diversified the customer base",
      description:
        "No single customer now exceeds 19% of revenue, down from 32%. Lower concentration directly de-risks the acquisition.",
      metric: { label: "Top customer", value: "19% of book" },
      source: "AR aging + invoices",
    },
    {
      id: "m-2025",
      year: 2025,
      period: "Today",
      category: "milestone",
      title: "Carl is ready to retire",
      description:
        "38 years of work, 31 people, a full order book — and a story that deserves the right next owner rather than an auction of the assets.",
      metric: { label: "Revenue", value: "$6.24M" },
      source: "Current financials",
    },
  ],
};
