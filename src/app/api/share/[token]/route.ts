/**
 * Public API: GET /api/share/[token]
 * POST /api/share/[token] — accept NDA (name+email) and log a view.
 * No auth required — token acts as the credential.
 *
 * Security:
 *  - Confidential (non-public) sections are NEVER returned by GET. The full
 *    payload is only released by POST after name+email are submitted, so the
 *    NDA gate is enforced server-side, not in the browser.
 *  - Visitor IPs are stored only as a SHA-256 hash.
 *  - Both verbs are rate-limited per IP when a KV namespace is available.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";
import { filterByTier } from "@/lib/share-tier";

/** NDA-gate submission. Everything a visitor sends is length-capped and typed
 *  before it touches the audit log. */
const ndaBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
});

interface ShareEnv {
  DB: D1Database;
  SESSIONS?: KVNamespace;
}

async function getEnv(): Promise<ShareEnv> {
  const ctx = await getCloudflareContext();
  return ctx.env as unknown as ShareEnv;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function checkRate(
  env: ShareEnv,
  req: Request,
  bucket: string,
  limit: number
): Promise<boolean> {
  if (!env.SESSIONS) return true; // no KV bound — skip limiting
  const ipHash = await sha256Hex(clientIp(req));
  const { allowed } = await rateLimit(env.SESSIONS, `${bucket}:${ipHash}`, limit, 60);
  return allowed;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const env = await getEnv();
  const db = drizzle(env.DB, { schema });

  if (!(await checkRate(env, req, "share-get", 60))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const shareToken = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.id, token))
    .get();

  if (!shareToken) {
    return Response.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }

  if (shareToken.maxViews && shareToken.viewCount >= shareToken.maxViews) {
    return Response.json({ error: "View limit reached" }, { status: 410 });
  }

  const profile = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.id, shareToken.profileId))
    .get();

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const org = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, shareToken.orgId))
    .get();

  let content: Record<string, string> = {};
  try { content = JSON.parse(profile.content); } catch { /* empty */ }

  const isPublic = shareToken.tier === "public";

  // GET only ever returns the public/teaser subset. Confidential sections are
  // released exclusively by POST after the NDA gate is satisfied.
  const teaser = filterByTier(content, "public");

  return Response.json({
    tier: shareToken.tier,
    requiresNda: !isPublic,
    org: {
      name: org?.name,
      vertical: org?.vertical,
      location: org?.location,
      founded: org?.founded,
      // employeeCount is confidential — withheld until NDA is accepted
    },
    profile: teaser,
    tokenId: token,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const env = await getEnv();
  const db = drizzle(env.DB, { schema });

  if (!(await checkRate(env, req, "share-post", 20))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const shareToken = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.id, token))
    .get();

  if (!shareToken) {
    return Response.json({ error: "Invalid link" }, { status: 404 });
  }

  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }

  // POST is what actually releases the confidential payload, so the view cap
  // must be enforced here too — not only on the initial GET.
  if (shareToken.maxViews && shareToken.viewCount >= shareToken.maxViews) {
    return Response.json({ error: "View limit reached" }, { status: 410 });
  }

  let body: z.infer<typeof ndaBodySchema> = {};
  try {
    const parsed = ndaBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid submission" }, { status: 400 });
    }
    body = parsed.data;
  } catch { /* no JSON body — treated as an empty submission below */ }

  const isPublic = shareToken.tier === "public";
  const ndaSatisfied = Boolean(body.name && body.email);

  // Non-public tiers require name + email before any confidential data flows.
  if (!isPublic && !ndaSatisfied) {
    return Response.json(
      { error: "Name and email are required to view this confidential profile" },
      { status: 403 }
    );
  }

  const ipHash = await sha256Hex(clientIp(req));

  await db.insert(schema.shareViews).values({
    id: nanoid(),
    tokenId: token,
    orgId: shareToken.orgId,
    viewerName: body.name ?? null,
    viewerEmail: body.email ?? null,
    ipHash,
    durationSeconds: body.durationSeconds ?? null,
  });

  // Atomic increment to prevent race condition on concurrent views
  await db
    .update(schema.shareTokens)
    .set({ viewCount: sql`view_count + 1` })
    .where(eq(schema.shareTokens.id, token));

  // Release the tier-appropriate confidential payload now that the gate passed.
  const profile = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.id, shareToken.profileId))
    .get();

  const org = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, shareToken.orgId))
    .get();

  let content: Record<string, string> = {};
  try { if (profile) content = JSON.parse(profile.content); } catch { /* empty */ }

  return Response.json({
    success: true,
    tier: shareToken.tier,
    org: {
      name: org?.name,
      vertical: org?.vertical,
      location: org?.location,
      founded: org?.founded,
      employeeCount: isPublic ? undefined : org?.employeeCount,
    },
    profile: filterByTier(content, shareToken.tier),
  });
}
