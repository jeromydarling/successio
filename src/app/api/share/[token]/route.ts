/**
 * Public API: GET /api/share/[token]
 * POST /api/share/[token] — log a view (NDA: name+email body)
 * No auth required — token acts as the credential.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

function nanoid(len = 21) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

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
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  // Check expiry
  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }

  // Check view limits
  if (shareToken.maxViews && shareToken.viewCount >= shareToken.maxViews) {
    return Response.json({ error: "View limit reached" }, { status: 410 });
  }

  // Load profile
  const profile = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.id, shareToken.profileId))
    .get();

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  // Load org
  const org = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, shareToken.orgId))
    .get();

  let content: Record<string, string> = {};
  try { content = JSON.parse(profile.content); } catch { /* empty */ }

  // Filter content by tier
  const filtered = filterByTier(content, shareToken.tier);

  return Response.json({
    tier: shareToken.tier,
    org: {
      name: org?.name,
      vertical: org?.vertical,
      location: org?.location,
      founded: org?.founded,
      employeeCount: shareToken.tier !== "public" ? org?.employeeCount : undefined,
    },
    profile: filtered,
    tokenId: token,
  });
}

export async function POST(
  req: Request,
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
    return Response.json({ error: "Invalid link" }, { status: 404 });
  }

  let body: { name?: string; email?: string; durationSeconds?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  // Log the view
  await db.insert(schema.shareViews).values({
    id: nanoid(),
    tokenId: token,
    orgId: shareToken.orgId,
    viewerName: body.name ?? null,
    viewerEmail: body.email ?? null,
    durationSeconds: body.durationSeconds ?? null,
  });

  // Increment view count
  await db
    .update(schema.shareTokens)
    .set({ viewCount: shareToken.viewCount + 1 })
    .where(eq(schema.shareTokens.id, token));

  return Response.json({ success: true });
}

function filterByTier(content: Record<string, string>, tier: string): Record<string, string> {
  const publicKeys = ["executive_summary", "business_overview", "opportunity"];
  const ndaKeys = [...publicKeys, "customer_overview", "financial_highlights", "operations", "team", "equipment_and_assets", "reason_for_sale"];
  const fullKeys = ndaKeys; // lender/buyer get everything

  const allowed = tier === "public" ? publicKeys : ndaKeys;
  return Object.fromEntries(
    Object.entries(content).filter(([k]) => allowed.includes(k))
  );
}
