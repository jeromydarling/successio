/**
 * GET /api/lender-package/[token]
 * Downloads a lender package for a given share token (tier must be "lender" or "buyer").
 * Returns a JSON bundle with profile + financials + document metadata.
 * (ZIP export requires a build-time compatible library — JSON bundle is the MVP implementation.)
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

async function getDb() {
  const ctx = await getCloudflareContext();
  return drizzle((ctx.env as any).DB, { schema });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = await getDb();

  const shareToken = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.id, token))
    .get();

  if (!shareToken) {
    return new Response("Invalid token", { status: 404 });
  }

  if (shareToken.tier !== "lender" && shareToken.tier !== "buyer") {
    return new Response("This link does not include lender package access", { status: 403 });
  }

  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    return new Response("Link expired", { status: 410 });
  }

  const orgId = shareToken.orgId;

  // Fetch all data
  const [org, profile, fins, custs, emps, equips, procs, docs] = await Promise.all([
    db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).get(),
    db.select().from(schema.businessProfiles).where(eq(schema.businessProfiles.orgId, orgId)).get(),
    db.select().from(schema.financials).where(eq(schema.financials.orgId, orgId)).all(),
    db.select().from(schema.customers).where(eq(schema.customers.orgId, orgId)).all(),
    db.select().from(schema.employees).where(eq(schema.employees.orgId, orgId)).all(),
    db.select().from(schema.equipment).where(eq(schema.equipment.orgId, orgId)).all(),
    db.select().from(schema.processes).where(eq(schema.processes.orgId, orgId)).all(),
    db.select({ id: schema.documents.id, originalName: schema.documents.originalName, mimeType: schema.documents.mimeType, status: schema.documents.status, r2Key: schema.documents.r2Key })
      .from(schema.documents).where(eq(schema.documents.orgId, orgId)).all(),
  ]);

  const bundle = {
    _meta: {
      generatedAt: new Date().toISOString(),
      packageVersion: "1.0",
      tier: shareToken.tier,
      disclaimer: "This document is confidential and intended solely for the authorized lender or buyer. Do not distribute without written consent.",
    },
    organization: org,
    profile: (() => {
      try { return JSON.parse(profile?.content ?? "{}"); } catch { return null; }
    })(),
    financials: fins,
    customers: custs,
    employees: emps,
    equipment: equips,
    processes: procs.map(p => ({
      ...p,
      steps: (() => { try { return JSON.parse(p.steps); } catch { return [p.steps]; } })(),
    })),
    documents: docs.map(d => ({
      id: d.id,
      name: d.originalName,
      mimeType: d.mimeType,
      status: d.status,
      // r2Key intentionally omitted — provide presigned URLs in a future version
    })),
  };

  const filename = `${(org?.name ?? "lender-package").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
