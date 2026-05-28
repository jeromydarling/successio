/**
 * Score Worker — Step 5 of the document pipeline.
 * Recalculates the Sale Readiness Score from the org's current extracted
 * entities, writes a new snapshot to readiness_scores, and derives checklist
 * completion from what actually exists in D1.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, count, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { calculateReadiness } from "@/lib/readiness";
import { nanoid } from "@/lib/nanoid";

export async function recalculateScore(params: {
  orgId: string;
  vertical: string;
  env: { DB: D1Database; PROCESSING_STATE?: DurableObjectNamespace };
}): Promise<{ score: number }> {
  const { orgId, vertical, env } = params;
  const db = drizzle(env.DB, { schema });

  // Count present entities — each becomes a checklist signal
  const [custCount, eqCount, finCount, procCount, empCount, certCount] = await Promise.all([
    db.select({ n: count() }).from(schema.customers).where(eq(schema.customers.orgId, orgId)).get(),
    db.select({ n: count() }).from(schema.equipment).where(eq(schema.equipment.orgId, orgId)).get(),
    db.select({ n: count() }).from(schema.financials).where(eq(schema.financials.orgId, orgId)).get(),
    db.select({ n: count() }).from(schema.processes).where(eq(schema.processes.orgId, orgId)).get(),
    db.select({ n: count() }).from(schema.employees).where(eq(schema.employees.orgId, orgId)).get(),
    // Compliance proxy: count documents whose detected type suggests certifications or licenses
    db.select({ n: count() })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.status, "complete")
        )
      )
      .get(),
  ]);

  const cust = custCount?.n ?? 0;
  const equip = eqCount?.n ?? 0;
  const fin = finCount?.n ?? 0;
  const proc = procCount?.n ?? 0;
  const emp = empCount?.n ?? 0;
  // Compliance: at least one completed document acts as a proxy until
  // document-type classification is used for fine-grained scoring
  const hasComplianceDocs = (certCount?.n ?? 0) >= 1;

  // Derive signals — weights within each category sum to 1
  const signals = [
    // Customers (20%)
    { category: "customers" as const, completed: cust >= 1,  weight: 0.5 },
    { category: "customers" as const, completed: cust >= 3,  weight: 0.3 },
    { category: "customers" as const, completed: cust >= 5,  weight: 0.2 },
    // Financials (25%) — 3 years = full marks
    { category: "financials" as const, completed: fin >= 1,  weight: 0.34 },
    { category: "financials" as const, completed: fin >= 2,  weight: 0.33 },
    { category: "financials" as const, completed: fin >= 3,  weight: 0.33 },
    // Operations (20%)
    { category: "operations" as const, completed: proc >= 1, weight: 0.5 },
    { category: "operations" as const, completed: proc >= 3, weight: 0.5 },
    // Equipment (15%)
    { category: "equipment" as const, completed: equip >= 1, weight: 0.6 },
    { category: "equipment" as const, completed: equip >= 5, weight: 0.4 },
    // People (10%)
    { category: "people" as const, completed: emp >= 1,      weight: 0.6 },
    { category: "people" as const, completed: emp >= 3,      weight: 0.4 },
    // Compliance (10%) — proxy: has any completed document
    { category: "compliance" as const, completed: hasComplianceDocs, weight: 1.0 },
  ];

  const { score, breakdown } = calculateReadiness(vertical, signals);

  await db.insert(schema.readinessScores).values({
    id: nanoid(),
    orgId,
    score,
    breakdown: JSON.stringify(breakdown),
  });

  // Update checklist rows to reflect completion
  await updateChecklist(db, orgId, vertical, {
    hasCustomers: cust >= 1,
    hasMultipleCustomers: cust >= 3,
    hasFinancials: fin >= 1,
    hasThreeYearFinancials: fin >= 3,
    hasSops: proc >= 1,
    hasEquipment: equip >= 1,
    hasKeyPersonnel: emp >= 1,
  });

  // Push a real-time update to any dashboard connected to this org's DO.
  await broadcastScore(env.PROCESSING_STATE, orgId, score);

  return { score };
}

/** Notify the per-org Durable Object so connected dashboards refresh via SSE. */
async function broadcastScore(
  ns: DurableObjectNamespace | undefined,
  orgId: string,
  score: number
): Promise<void> {
  if (!ns) return;
  try {
    const stub = ns.get(ns.idFromName(`org_${orgId}`));
    await stub.fetch("https://do/broadcast", {
      method: "POST",
      body: JSON.stringify({ type: "score", orgId, score, at: Date.now() }),
    });
  } catch (err) {
    // Never let a notification failure break the pipeline.
    console.warn("[score] broadcast failed:", err);
  }
}

async function updateChecklist(
  db: ReturnType<typeof drizzle>,
  orgId: string,
  vertical: string,
  flags: Record<string, boolean>
) {
  const itemMap: [string, string, string, boolean][] = [
    ["customers", "customer_list",       "Customer list extracted",       flags.hasCustomers],
    ["customers", "multiple_customers",  "3+ customers documented",       flags.hasMultipleCustomers],
    ["financials","financials_present",  "Financial records uploaded",    flags.hasFinancials],
    ["financials","three_year_financials","3 years of P&L available",    flags.hasThreeYearFinancials],
    ["operations","sops_present",        "Core SOPs documented",         flags.hasSops],
    ["equipment", "equipment_list",      "Equipment list extracted",      flags.hasEquipment],
    ["people",    "key_personnel",       "Key personnel identified",     flags.hasKeyPersonnel],
  ];

  for (const [category, key, label, completed] of itemMap) {
    const existing = await db
      .select({ id: schema.readinessChecklist.id, completed: schema.readinessChecklist.completed })
      .from(schema.readinessChecklist)
      .where(
        and(
          eq(schema.readinessChecklist.orgId, orgId),
          eq(schema.readinessChecklist.itemKey, key)
        )
      )
      .get();

    if (!existing) {
      await db.insert(schema.readinessChecklist).values({
        id: nanoid(),
        orgId,
        vertical,
        category,
        itemKey: key,
        label,
        completed,
        completedAt: completed ? new Date() : undefined,
      }).onConflictDoNothing();
    } else if (completed && !existing.completed) {
      // Only update if newly completed — avoid overwriting completedAt timestamp
      await db.update(schema.readinessChecklist)
        .set({ completed: true, completedAt: new Date() })
        .where(
          and(
            eq(schema.readinessChecklist.orgId, orgId),
            eq(schema.readinessChecklist.itemKey, key)
          )
        );
    }
  }
}
