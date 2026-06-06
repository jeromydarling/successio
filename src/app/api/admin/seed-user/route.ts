/**
 * POST /api/admin/seed-user  (token + email via query or JSON body)
 *
 * Populates an e2e+ test account with a coherent, representative dataset so the
 * E2E rig can exercise every downstream feature deterministically — without
 * depending on the live OCR/extraction/AI pipeline:
 *   - documents (status "complete") + extracted entities (detail slide-over)
 *   - customers / financials / employees / equipment / processes (profile inputs)
 *   - a readiness score of 64 + breakdown + checklist (dashboard)
 *   - a fully-written business profile (deal room, share tiers, PDF, translation)
 *   - a couple of milestones (history timeline + revenue sparkline)
 *
 * Guarded by {@link checkE2eAuth}: token + e2e+ allowlist only.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { readE2eCreds, checkE2eAuth } from "@/lib/e2e-admin";

const PROFILE_CONTENT = {
  executive_summary:
    "Brenner Precision is a profitable, 30-year precision machine shop serving Tier-1 automotive and aerospace suppliers. The owner is retiring and seeking a buyer to continue a stable, well-documented operation with recurring contract revenue.",
  business_overview:
    "Founded in 1994, the company operates a 22,000 sq ft facility with 9 CNC machining centers and 12 full-time employees. The business holds AS9100 and ISO 9001 certifications.",
  opportunity:
    "A turnkey acquisition of an established shop with documented SOPs, trained staff, and multi-year customer relationships — a rare chance to step into a cash-flowing operation rather than build from scratch.",
  customer_overview:
    "The top three customers represent roughly 55% of revenue under active multi-year contracts. The remaining book is diversified across 40+ smaller accounts.",
  financial_highlights:
    "Revenue grew from $4.9M in 2021 to $6.2M in 2023, with EBITDA margins near 18%. Owner compensation and add-backs are fully documented for buyer diligence.",
  operations:
    "Core processes — quoting, job traveling, first-article inspection, and shipping — are documented as written SOPs. A work-order system tracks every job from quote to delivery.",
  team:
    "A long-tenured team anchors the business: a lead machinist (22 years), a quality manager (15 years), and a shop foreman (18 years). Most roles are cross-trained.",
  equipment_and_assets:
    "Nine CNC machining centers (Haas, Mazak, DMG Mori) ranging 2 to 14 years old, well-maintained with service records, plus inspection and tooling assets.",
  reason_for_sale:
    "The founder is retiring after 30 years and wants to transition the business to an owner who will keep the team intact and the customer commitments honored.",
};

const CHECKLIST: Array<[string, string, string, boolean]> = [
  // [category, itemKey, label, completed]
  ["customers", "customer_list", "Customer list extracted", true],
  ["customers", "revenue_by_customer", "Revenue by customer documented", true],
  ["financials", "pnl_3yr", "3 years of P&L extractable", true],
  ["financials", "job_cost", "Job cost data present", false],
  ["operations", "core_sops", "Core processes documented", true],
  ["equipment", "equipment_list", "Equipment list with ages", true],
  ["people", "key_roles", "Key employee roles documented", true],
  ["compliance", "certs", "Certifications documented", false],
];

export async function POST(req: Request): Promise<Response> {
  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Bindings unavailable" }, { status: 503 });
  }
  const e = env as unknown as { DB: D1Database; E2E_ADMIN_TOKEN?: string };

  const { token, email } = await readE2eCreds(req);
  const auth = checkE2eAuth(e.E2E_ADMIN_TOKEN, token, email);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = drizzle(e.DB, { schema });
  const user = await db
    .select({ id: schema.users.id, orgId: schema.users.orgId })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();
  if (!user) return Response.json({ ok: false, error: "no such user" }, { status: 404 });

  const orgId = user.orgId;
  const vertical = "manufacturing";

  // ── Documents (complete) ───────────────────────────────────────────────────
  const docPnl = nanoid();
  const docCust = nanoid();
  const docEquip = nanoid();
  await db.insert(schema.documents).values([
    {
      id: docPnl, orgId, uploadedBy: user.id, r2Key: `seed/${orgId}/pnl.pdf`,
      originalName: "PnL-2021-2023.pdf", mimeType: "application/pdf", sizeBytes: 184_320,
      fileType: "pdf", documentType: "financial", status: "complete", ocrConfidence: 0.97,
      ocrText: "Profit & Loss 2021-2023. Revenue 4,900,000 / 5,550,000 / 6,240,000 ...",
    },
    {
      id: docCust, orgId, uploadedBy: user.id, r2Key: `seed/${orgId}/customers.xlsx`,
      originalName: "Customer-List.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 41_984, fileType: "spreadsheet", documentType: "customer_list",
      status: "complete", ocrConfidence: 0.93,
    },
    {
      id: docEquip, orgId, uploadedBy: user.id, r2Key: `seed/${orgId}/equipment.pdf`,
      originalName: "Equipment-Ledger.pdf", mimeType: "application/pdf", sizeBytes: 96_256,
      fileType: "pdf", documentType: "equipment_list", status: "complete", ocrConfidence: 0.95,
    },
  ]);

  // ── Extracted entities (drive the detail slide-over) ───────────────────────
  await db.insert(schema.extractedEntities).values([
    { id: nanoid(), documentId: docCust, orgId, entityType: "customer", confidence: 0.92, needsReview: false,
      data: JSON.stringify({ name: "Goodyear Tire & Rubber", revenueShare: 0.28, contractStatus: "active" }) },
    { id: nanoid(), documentId: docPnl, orgId, entityType: "financial", confidence: 0.96, needsReview: false,
      data: JSON.stringify({ year: 2023, revenue: 6_240_000, ebitda: 1_120_000 }) },
    { id: nanoid(), documentId: docEquip, orgId, entityType: "equipment", confidence: 0.6, needsReview: true,
      data: JSON.stringify({ name: "Mazak Integrex i-200", yearInstalled: 2016 }) },
  ]);

  // ── Customers / financials / employees / equipment / processes ─────────────
  await db.insert(schema.customers).values([
    { id: nanoid(), orgId, name: "Goodyear Tire & Rubber", revenueShare: 0.28, contractStatus: "active", sourceDocumentId: docCust },
    { id: nanoid(), orgId, name: "Parker Hannifin", revenueShare: 0.17, contractStatus: "active", sourceDocumentId: docCust },
    { id: nanoid(), orgId, name: "Timken Company", revenueShare: 0.1, contractStatus: "month-to-month", sourceDocumentId: docCust },
  ]);
  await db.insert(schema.financials).values([
    { id: nanoid(), orgId, year: 2021, revenue: 4_900_000, grossProfit: 1_470_000, ebitda: 830_000, ownerCompensation: 320_000, sourceDocumentId: docPnl },
    { id: nanoid(), orgId, year: 2022, revenue: 5_550_000, grossProfit: 1_720_000, ebitda: 980_000, ownerCompensation: 340_000, sourceDocumentId: docPnl },
    { id: nanoid(), orgId, year: 2023, revenue: 6_240_000, grossProfit: 1_990_000, ebitda: 1_120_000, ownerCompensation: 360_000, sourceDocumentId: docPnl },
  ]);
  await db.insert(schema.employees).values([
    { id: nanoid(), orgId, name: "Dave Kowalski", role: "Lead Machinist", tenureYears: 22, isKeyPerson: true },
    { id: nanoid(), orgId, name: "Maria Alvarez", role: "Quality Manager", tenureYears: 15, isKeyPerson: true },
  ]);
  await db.insert(schema.equipment).values([
    { id: nanoid(), orgId, name: "Mazak Integrex i-200", manufacturer: "Mazak", model: "i-200", yearInstalled: 2016, condition: "good", estimatedValue: 285_000, sourceDocumentId: docEquip },
    { id: nanoid(), orgId, name: "Haas VF-4SS", manufacturer: "Haas", model: "VF-4SS", yearInstalled: 2019, condition: "excellent", estimatedValue: 95_000, sourceDocumentId: docEquip },
  ]);
  await db.insert(schema.processes).values([
    { id: nanoid(), orgId, title: "How we quote a new job", source: "extracted", sourceDocumentId: docPnl,
      steps: JSON.stringify(["Review the customer print and tolerances", "Estimate material and cycle time", "Apply standard margin", "Send the quote within 48 hours"]) },
  ]);

  // ── Readiness score + checklist (dashboard) ────────────────────────────────
  await db.insert(schema.readinessScores).values({
    id: nanoid(), orgId, score: 64,
    breakdown: JSON.stringify({ customers: 70, financials: 80, operations: 55, equipment: 60, people: 50, compliance: 40 }),
  });
  await db.insert(schema.readinessChecklist).values(
    CHECKLIST.map(([category, itemKey, label, completed]) => ({
      id: nanoid(), orgId, vertical, category, itemKey, label,
      completed, completedAt: completed ? new Date() : null,
    }))
  );

  // ── A fully-written profile (deal room, share, PDF, translation) ───────────
  await db.insert(schema.businessProfiles).values({
    id: nanoid(), orgId, title: "Brenner Precision — Business Profile",
    content: JSON.stringify(PROFILE_CONTENT), isDraft: false,
  });

  // ── Milestones (history timeline) ──────────────────────────────────────────
  await db.insert(schema.orgMilestones).values([
    { id: nanoid(), orgId, year: 1994, category: "founding", title: "Brenner Precision founded", description: "Opened a single-bay shop with one manual lathe.", source: "Company records", isManual: false },
    { id: nanoid(), orgId, year: 2008, category: "customer", title: "Landed the Goodyear tooling contract", description: "First multi-year anchor contract.", metricLabel: "Anchor revenue", metricValue: "28% of book", source: "Contract records", isManual: false },
  ]);

  return Response.json({ ok: true, seeded: true, orgId });
}
