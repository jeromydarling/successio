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
import { eq, and, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";
import { filterByTier } from "@/lib/share-tier";
import { getEmailSender } from "@/lib/email/sender";
import { shareVerificationEmail } from "@/lib/email/templates";

/** NDA-gate submission. Everything a visitor sends is length-capped and typed
 *  before it touches the audit log. */
const ndaBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  /** 6-digit email verification code (second step of the gate). */
  code: z.string().trim().regex(/^\d{6}$/).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
});

interface ShareEnv {
  DB: D1Database;
  SESSIONS?: KVNamespace;
  EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
  CF_API_TOKEN?: string;
  EMAIL_FROM?: string;
}

/** Cryptographically random 6-digit code. */
function makeCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
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

  // Non-public tiers require name + a VERIFIED email before any confidential
  // data flows. Verification: a 6-digit code is emailed to the address the
  // viewer entered; the payload releases only when the code comes back. This
  // stops "a@b.co" from unlocking someone's lifetime financials.
  if (!isPublic) {
    if (!body.name || !body.email) {
      return Response.json(
        { error: "Name and email are required to view this confidential profile" },
        { status: 403 }
      );
    }
    const email = body.email.toLowerCase();

    // Test-rig orgs (owner is an e2e+ account on fictional seeded data) keep
    // the single-step gate so automated tests don't need an inbox.
    const owner = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, shareToken.orgId), eq(schema.users.role, "owner")))
      .get();
    const isTestOrg = !!owner?.email && /^e2e\+/i.test(owner.email);

    if (!isTestOrg) {
      const now = Date.now();

      if (!body.code) {
        // Step 1: issue a code to the entered address.
        if (env.SESSIONS) {
          const key = `share-code:${await sha256Hex(`${token}:${email}`)}`;
          const { allowed } = await rateLimit(env.SESSIONS, key, 3, 600);
          if (!allowed) {
            return Response.json({ error: "Too many code requests — wait a few minutes" }, { status: 429 });
          }
        }
        const code = makeCode();
        const org = await db
          .select({ name: schema.organizations.name })
          .from(schema.organizations)
          .where(eq(schema.organizations.id, shareToken.orgId))
          .get();
        // One active code per (token, email).
        await db
          .delete(schema.shareVerifications)
          .where(and(eq(schema.shareVerifications.tokenId, token), eq(schema.shareVerifications.email, email)));
        await db.insert(schema.shareVerifications).values({
          id: nanoid(),
          tokenId: token,
          email,
          codeHash: await sha256Hex(`${token}:${code}`),
          expiresAt: new Date(now + 15 * 60 * 1000),
        });
        try {
          const mail = shareVerificationEmail({ code, orgName: org?.name ?? "this business" });
          await getEmailSender(env as Parameters<typeof getEmailSender>[0]).send({ to: email, ...mail });
        } catch (err) {
          console.error("[share] verification email failed:", err);
          return Response.json(
            { error: "We couldn't send the verification email — try again shortly." },
            { status: 502 }
          );
        }
        return Response.json({ verificationRequired: true }, { status: 202 });
      }

      // Step 2: validate the code.
      const row = await db
        .select()
        .from(schema.shareVerifications)
        .where(and(eq(schema.shareVerifications.tokenId, token), eq(schema.shareVerifications.email, email)))
        .get();

      if (!row || row.expiresAt.getTime() < now) {
        return Response.json(
          { error: "That code has expired — request a new one.", codeExpired: true },
          { status: 403 }
        );
      }
      if (row.attempts >= 6) {
        return Response.json({ error: "Too many incorrect attempts — request a new code.", codeExpired: true }, { status: 429 });
      }
      const expected = await sha256Hex(`${token}:${body.code}`);
      if (expected !== row.codeHash) {
        await db
          .update(schema.shareVerifications)
          .set({ attempts: row.attempts + 1 })
          .where(eq(schema.shareVerifications.id, row.id));
        return Response.json({ error: "Incorrect code — check the email and try again." }, { status: 403 });
      }
      await db
        .update(schema.shareVerifications)
        .set({ verifiedAt: new Date() })
        .where(eq(schema.shareVerifications.id, row.id));
    }
  }

  const ipHash = await sha256Hex(clientIp(req));

  const viewId = nanoid();
  await db.insert(schema.shareViews).values({
    id: viewId,
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
    // Opaque id for the follow-up engagement beacon (sections read, duration).
    viewId,
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
