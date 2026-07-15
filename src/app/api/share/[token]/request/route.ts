/**
 * POST /api/share/[token]/request — a buyer-tier visitor asks the owner for
 * specific documents. Human-in-the-loop by design: nothing is auto-released;
 * the request lands in the owner's Deal Room (and their inbox) and the owner
 * decides what to send.
 *
 * Public (the token is the credential) — rate-limited, Zod-validated, and
 * restricted to buyer-tier tokens that are still live.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and, count } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";
import { getEmailSender } from "@/lib/email/sender";
import { documentRequestEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

interface RequestEnv {
  DB: D1Database;
  SESSIONS?: KVNamespace;
  EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
  EMAIL_FROM?: string;
  APP_URL?: string;
}

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  request: z.string().trim().min(5).max(2000),
});

/** Per-token cap so one link can't be used to flood the owner. */
const MAX_OPEN_REQUESTS_PER_TOKEN = 20;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const env = (await getCloudflareContext()).env as unknown as RequestEnv;
  const db = drizzle(env.DB, { schema });

  // 5 requests/minute per IP.
  if (env.SESSIONS) {
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { allowed } = await rateLimit(env.SESSIONS, `doc-req:${await sha256Hex(ip)}`, 5, 60);
    if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please fill in your name, email, and what you need." }, { status: 400 });
  }

  const shareToken = await db
    .select()
    .from(schema.shareTokens)
    .where(eq(schema.shareTokens.id, token))
    .get();

  if (!shareToken) return Response.json({ error: "Invalid link" }, { status: 404 });
  if (shareToken.tier !== "buyer") {
    return Response.json({ error: "This link does not include document requests" }, { status: 403 });
  }
  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }

  const open = await db
    .select({ n: count() })
    .from(schema.documentRequests)
    .where(
      and(
        eq(schema.documentRequests.tokenId, token),
        eq(schema.documentRequests.status, "pending")
      )
    )
    .get();
  if ((open?.n ?? 0) >= MAX_OPEN_REQUESTS_PER_TOKEN) {
    return Response.json(
      { error: "There are already several open requests on this link — the owner will respond soon." },
      { status: 429 }
    );
  }

  await db.insert(schema.documentRequests).values({
    id: nanoid(),
    orgId: shareToken.orgId,
    tokenId: token,
    requesterName: parsed.data.name,
    requesterEmail: parsed.data.email,
    requestText: parsed.data.request,
  });

  // Best-effort owner notification — the request row is already saved.
  try {
    const owner = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, shareToken.orgId), eq(schema.users.role, "owner")))
      .get();
    const org = await db
      .select({ name: schema.organizations.name })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, shareToken.orgId))
      .get();
    if (owner) {
      const mail = documentRequestEmail({
        name: owner.name,
        orgName: org?.name ?? "your business",
        requesterName: parsed.data.name,
        requesterEmail: parsed.data.email,
        requestText: parsed.data.request,
        url: `${appUrl(env)}/profile`,
      });
      await getEmailSender(env as Parameters<typeof getEmailSender>[0]).send({ to: owner.email, ...mail });
    }
  } catch (err) {
    console.error("[doc-request] owner notification failed:", err);
  }

  return Response.json({ ok: true });
}
