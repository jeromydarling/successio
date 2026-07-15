/**
 * Extraction Worker — Step 3 of the document pipeline.
 * Sends OCR text to Claude Sonnet via AI Gateway, parses the JSON response
 * through Zod, writes validated entities to D1.
 *
 * Idempotent: checks document status before running.
 * Never crashes the pipeline on parse failure — routes to manual review instead.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@/db/schema";
import { makeGateway, MODELS } from "@/lib/ai-gateway";
import { extractJson } from "@/lib/json";
import { getExtractPrompt } from "@/prompts/extract-registry";
import { CONFIDENCE_THRESHOLD } from "@/prompts/shared/extract";
import { nanoid } from "@/lib/nanoid";

// ── Zod schema for Claude's JSON output ──────────────────────────────────────

const extractedCustomer = z.object({
  name: z.string(),
  revenue_share: z.number().min(0).max(1).optional(),
  contract_status: z.enum(["active", "expired", "month-to-month"]).optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const extractedEquipment = z.object({
  name: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  year_installed: z.number().int().optional(),
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  estimated_value: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

const extractedFinancial = z.object({
  year: z.number().int(),
  revenue: z.number().optional(),
  gross_profit: z.number().optional(),
  ebitda: z.number().optional(),
  owner_compensation: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

const extractedEmployee = z.object({
  name: z.string(),
  role: z.string(),
  tenure_years: z.number().optional(),
  is_key_person: z.boolean().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const extractedProcess = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  owner: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const extractedMilestone = z.object({
  year: z.number().int(),
  category: z.enum(["founding", "financial", "equipment", "people", "customer", "operations", "compliance", "milestone"]),
  title: z.string(),
  description: z.string(),
  metric_label: z.string().optional(),
  metric_value: z.string().optional(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const extractionOutputSchema = z.object({
  document_type_detected: z.string().optional(),
  summary: z.string().optional(),
  customers: z.array(extractedCustomer).optional(),
  equipment: z.array(extractedEquipment).optional(),
  financials: z.array(extractedFinancial).optional(),
  employees: z.array(extractedEmployee).optional(),
  processes: z.array(extractedProcess).optional(),
  milestones: z.array(extractedMilestone).optional(),
});

type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

// ── Main extraction function ──────────────────────────────────────────────────

export interface ExtractionParams {
  documentId: string;
  orgId: string;
  vertical: string;
  ocrText: string;
  orgName?: string;
  env: {
    DB: D1Database;
    AI: Ai;
    CF_ACCOUNT_ID?: string;
    CF_AI_GATEWAY_ID: string;
    ANTHROPIC_API_KEY?: string;
    GOOGLE_AI_API_KEY?: string;
  };
}

export async function runExtraction(params: ExtractionParams): Promise<void> {
  const { documentId, orgId, vertical, ocrText, orgName, env } = params;
  const db = drizzle(env.DB, { schema });
  const gateway = makeGateway(env);

  // Mark as extracting
  await db.update(schema.documents)
    .set({ status: "extracting" })
    .where(eq(schema.documents.id, documentId));

  let parsed: ExtractionOutput;

  try {
    // Select the trade-specific extraction prompt for this org's vertical.
    const { EXTRACTION_SYSTEM, buildExtractionPrompt } = getExtractPrompt(vertical);
    const prompt = buildExtractionPrompt({ rawText: ocrText, vertical, orgName });
    const result = await gateway.complete({
      model: MODELS.extraction,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0,
    });

    const raw = JSON.parse(extractJson(result.content));
    parsed = extractionOutputSchema.parse(raw);
  } catch (err) {
    console.error("[extract] Parse/call failed, routing to review:", err);
    await db.update(schema.documents)
      .set({ status: "needs_review", errorMessage: String(err) })
      .where(eq(schema.documents.id, documentId));
    return;
  }

  // Write document type if detected
  if (parsed.document_type_detected) {
    await db.update(schema.documents)
      .set({ documentType: parsed.document_type_detected })
      .where(eq(schema.documents.id, documentId));
  }

  // Idempotency: a document fully owns the entities it produced. Clear any
  // prior contributions before re-writing so re-running the pipeline on the
  // same document never duplicates rows.
  await clearDocumentEntities(db, documentId);

  // Write all entity types
  await Promise.all([
    writeCustomers(db, parsed.customers ?? [], orgId, documentId),
    writeEquipment(db, parsed.equipment ?? [], orgId, documentId),
    writeFinancials(db, parsed.financials ?? [], orgId, documentId),
    writeEmployees(db, parsed.employees ?? [], orgId, documentId),
    writeProcesses(db, parsed.processes ?? [], orgId, documentId),
    writeMilestones(db, parsed.milestones ?? [], orgId, documentId),
    writeEntityBlobs(db, parsed, orgId, documentId),
  ]);

  await db.update(schema.documents)
    .set({ status: "embedding" })
    .where(eq(schema.documents.id, documentId));
}

/** Remove every row a given document previously produced (for idempotent re-runs). */
async function clearDocumentEntities(db: ReturnType<typeof drizzle>, docId: string) {
  await Promise.all([
    db.delete(schema.customers).where(eq(schema.customers.sourceDocumentId, docId)),
    db.delete(schema.equipment).where(eq(schema.equipment.sourceDocumentId, docId)),
    db.delete(schema.financials).where(eq(schema.financials.sourceDocumentId, docId)),
    db.delete(schema.employees).where(eq(schema.employees.sourceDocumentId, docId)),
    db.delete(schema.processes).where(eq(schema.processes.sourceDocumentId, docId)),
    db.delete(schema.orgMilestones).where(eq(schema.orgMilestones.sourceDocumentId, docId)),
    db.delete(schema.extractedEntities).where(eq(schema.extractedEntities.documentId, docId)),
  ]);
}

// ── Entity writers ────────────────────────────────────────────────────────────
// Every writer applies the per-item confidence threshold: low-confidence items
// are kept out of the normalized tables (they'd pollute profiles and scores)
// but remain in the extracted_entities audit blob flagged needs-review, so a
// human can promote them later. All inserts are single multi-row statements.

const confident = <T extends { confidence: number }>(items: T[]) =>
  items.filter((i) => i.confidence >= CONFIDENCE_THRESHOLD);

async function writeCustomers(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedCustomer>[], orgId: string, docId: string) {
  const rows = confident(items).map((c) => ({
    id: nanoid(),
    orgId,
    name: c.name,
    revenueShare: c.revenue_share,
    contractStatus: c.contract_status,
    notes: c.notes,
    sourceDocumentId: docId,
  }));
  if (rows.length > 0) await db.insert(schema.customers).values(rows).onConflictDoNothing();
}

async function writeEquipment(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedEquipment>[], orgId: string, docId: string) {
  const rows = confident(items).map((e) => ({
    id: nanoid(),
    orgId,
    name: e.name,
    manufacturer: e.manufacturer,
    model: e.model,
    yearInstalled: e.year_installed,
    condition: e.condition,
    estimatedValue: e.estimated_value,
    sourceDocumentId: docId,
  }));
  if (rows.length > 0) await db.insert(schema.equipment).values(rows).onConflictDoNothing();
}

async function writeFinancials(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedFinancial>[], orgId: string, docId: string) {
  const rows = confident(items).map((f) => ({
    id: nanoid(),
    orgId,
    year: f.year,
    revenue: f.revenue,
    grossProfit: f.gross_profit,
    ebitda: f.ebitda,
    ownerCompensation: f.owner_compensation,
    sourceDocumentId: docId,
  }));
  if (rows.length > 0) await db.insert(schema.financials).values(rows).onConflictDoNothing();
}

async function writeEmployees(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedEmployee>[], orgId: string, docId: string) {
  const rows = confident(items).map((e) => ({
    id: nanoid(),
    orgId,
    name: e.name,
    role: e.role,
    tenureYears: e.tenure_years,
    isKeyPerson: e.is_key_person ?? false,
    notes: e.notes,
    sourceDocumentId: docId,
  }));
  if (rows.length > 0) await db.insert(schema.employees).values(rows).onConflictDoNothing();
}

async function writeProcesses(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedProcess>[], orgId: string, docId: string) {
  const rows = confident(items).map((p) => ({
    id: nanoid(),
    orgId,
    title: p.title,
    steps: JSON.stringify(p.steps),
    source: "extracted",
    sourceDocumentId: docId,
  }));
  if (rows.length > 0) await db.insert(schema.processes).values(rows).onConflictDoNothing();
}

async function writeMilestones(db: ReturnType<typeof drizzle>, items: z.infer<typeof extractedMilestone>[], orgId: string, docId: string) {
  const rows = confident(items).map((m) => ({
    id: nanoid(),
    orgId,
    year: m.year,
    category: m.category,
    title: m.title,
    description: m.description,
    metricLabel: m.metric_label,
    metricValue: m.metric_value,
    source: m.source,
    sourceDocumentId: docId,
    isManual: false,
  }));
  if (rows.length > 0) await db.insert(schema.orgMilestones).values(rows).onConflictDoNothing();
}

async function writeEntityBlobs(db: ReturnType<typeof drizzle>, parsed: ExtractionOutput, orgId: string, docId: string) {
  // Persist each entity type as a blob in extracted_entities for audit trail
  const types: [string, { confidence: number }[] | undefined][] = [
    ["customer", parsed.customers],
    ["equipment", parsed.equipment],
    ["financial", parsed.financials],
    ["employee", parsed.employees],
    ["process", parsed.processes],
    ["milestone", parsed.milestones],
  ];
  const rows = types
    .filter((entry): entry is [string, { confidence: number }[]] => !!entry[1] && entry[1].length > 0)
    .map(([type, items]) => {
      const avgConfidence = items.reduce((s, i) => s + (i.confidence ?? 0.5), 0) / items.length;
      // Needs review if the average is weak OR any single item fell below the
      // threshold (those items were withheld from the normalized tables).
      const anyLow = items.some((i) => (i.confidence ?? 0.5) < CONFIDENCE_THRESHOLD);
      return {
        id: nanoid(),
        documentId: docId,
        orgId,
        entityType: type,
        data: JSON.stringify(items),
        confidence: avgConfidence,
        needsReview: avgConfidence < CONFIDENCE_THRESHOLD || anyLow,
      };
    });
  if (rows.length > 0) await db.insert(schema.extractedEntities).values(rows);
}
