/**
 * POST /api/share/[token]/track — engagement beacon from the share page.
 * Sent via navigator.sendBeacon on page hide: which sections the visitor
 * actually read and for how long. Updates the share_views row the initial
 * POST created (viewId is returned by that call and acts as the credential
 * together with the token).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import * as schema from "@/db/schema";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";

interface TrackEnv {
  DB: D1Database;
  SESSIONS?: KVNamespace;
}

const bodySchema = z.object({
  viewId: z.string().min(1).max(64),
  sections: z.array(z.string().max(40)).max(20).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const env = (await getCloudflareContext()).env as unknown as TrackEnv;
  const db = drizzle(env.DB, { schema });

  if (env.SESSIONS) {
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { allowed } = await rateLimit(env.SESSIONS, `share-track:${await sha256Hex(ip)}`, 30, 60);
    if (!allowed) return new Response(null, { status: 429 });
  }

  // sendBeacon posts text/plain — parse the raw body rather than relying on
  // a JSON content type.
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(await req.text()));
  } catch {
    return new Response(null, { status: 400 });
  }

  // The view row must belong to THIS token — viewId alone is not enough.
  const view = await db
    .select({ id: schema.shareViews.id })
    .from(schema.shareViews)
    .where(
      and(eq(schema.shareViews.id, parsed.viewId), eq(schema.shareViews.tokenId, token))
    )
    .get();
  if (!view) return new Response(null, { status: 404 });

  await db
    .update(schema.shareViews)
    .set({
      ...(parsed.sections ? { sectionsViewed: JSON.stringify(parsed.sections) } : {}),
      ...(parsed.durationSeconds !== undefined ? { durationSeconds: parsed.durationSeconds } : {}),
    })
    .where(eq(schema.shareViews.id, parsed.viewId));

  return new Response(null, { status: 204 });
}
