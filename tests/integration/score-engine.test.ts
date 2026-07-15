/**
 * Integration: the Sale Readiness Score engine against a real D1 database.
 * Verifies snapshot writes, checklist derivation, and that duplicate
 * financial years (same year from two documents) don't inflate the score.
 */

import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@/db/schema";
import { recalculateScore } from "@/server/workers/score";

const db = drizzle(env.DB, { schema });

const ORG_ID = "score-org-1";

beforeAll(async () => {
  await db.insert(schema.organizations).values({
    id: ORG_ID,
    name: "Score Test Fabrication",
    vertical: "manufacturing",
  });
  // 3 customers, 1 equipment item, 1 employee.
  await db.insert(schema.customers).values([
    { id: "sc-c1", orgId: ORG_ID, name: "Acme" },
    { id: "sc-c2", orgId: ORG_ID, name: "Globex" },
    { id: "sc-c3", orgId: ORG_ID, name: "Initech" },
  ]);
  await db.insert(schema.equipment).values([{ id: "sc-e1", orgId: ORG_ID, name: "CNC Lathe" }]);
  await db.insert(schema.employees).values([
    { id: "sc-p1", orgId: ORG_ID, name: "Maria", role: "Foreman" },
  ]);
  // The SAME fiscal year extracted from two different documents + one more
  // year — distinct years = 2, rows = 3.
  await db.insert(schema.financials).values([
    { id: "sc-f1", orgId: ORG_ID, year: 2024, revenue: 5_000_000, sourceDocumentId: "docA" },
    { id: "sc-f2", orgId: ORG_ID, year: 2024, revenue: 5_100_000, sourceDocumentId: "docB" },
    { id: "sc-f3", orgId: ORG_ID, year: 2023, revenue: 4_200_000, sourceDocumentId: "docA" },
  ]);
});

describe("recalculateScore", () => {
  it("writes a snapshot and derives the checklist from real entity counts", async () => {
    const { score } = await recalculateScore({
      orgId: ORG_ID,
      vertical: "manufacturing",
      env: { DB: env.DB },
    });

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    const snapshot = await db
      .select()
      .from(schema.readinessScores)
      .where(eq(schema.readinessScores.orgId, ORG_ID))
      .orderBy(desc(schema.readinessScores.createdAt))
      .limit(1)
      .get();
    expect(snapshot).toBeTruthy();
    expect(snapshot!.score).toBe(score);
    expect(() => JSON.parse(snapshot!.breakdown)).not.toThrow();

    const checklist = await db
      .select()
      .from(schema.readinessChecklist)
      .where(eq(schema.readinessChecklist.orgId, ORG_ID))
      .all();
    const byKey = new Map(checklist.map((c) => [c.itemKey, c.completed]));
    expect(byKey.get("customer_list")).toBe(true);       // 3 customers
    expect(byKey.get("multiple_customers")).toBe(true);  // >= 3
    expect(byKey.get("financials_present")).toBe(true);  // has financials
    expect(byKey.get("equipment_list")).toBe(true);
    expect(byKey.get("key_personnel")).toBe(true);
  });

  it("counts DISTINCT financial years — duplicate years don't fake 3-year P&L", async () => {
    await recalculateScore({ orgId: ORG_ID, vertical: "manufacturing", env: { DB: env.DB } });
    const row = await db
      .select({ completed: schema.readinessChecklist.completed })
      .from(schema.readinessChecklist)
      .where(
        and(
          eq(schema.readinessChecklist.orgId, ORG_ID),
          eq(schema.readinessChecklist.itemKey, "three_year_financials")
        )
      )
      .get();
    // 3 rows but only 2 distinct years → three-year milestone NOT complete.
    expect(row?.completed).toBe(false);
  });

  it("is idempotent across reruns — each run appends a snapshot, checklist stays consistent", async () => {
    const first = await recalculateScore({ orgId: ORG_ID, vertical: "manufacturing", env: { DB: env.DB } });
    const second = await recalculateScore({ orgId: ORG_ID, vertical: "manufacturing", env: { DB: env.DB } });
    expect(second.score).toBe(first.score);

    // Storage is isolated per test (pool-workers rolls back between tests),
    // so exactly the two runs above are visible here.
    const snapshots = await db
      .select({ id: schema.readinessScores.id })
      .from(schema.readinessScores)
      .where(eq(schema.readinessScores.orgId, ORG_ID))
      .all();
    expect(snapshots.length).toBe(2);

    // No duplicate checklist rows despite multiple runs.
    const checklist = await db
      .select({ itemKey: schema.readinessChecklist.itemKey })
      .from(schema.readinessChecklist)
      .where(eq(schema.readinessChecklist.orgId, ORG_ID))
      .all();
    const keys = checklist.map((c) => c.itemKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
