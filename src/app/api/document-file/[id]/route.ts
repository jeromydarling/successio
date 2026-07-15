/**
 * GET /api/document-file/[id] — stream a document's bytes from R2 to its
 * owner. Session-authed and org-scoped; used for vault thumbnails (images)
 * and original-file download from the document detail view.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { verifySession, getTokenFromCookie } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  let env: { DB: D1Database; DOCUMENTS: R2Bucket; JWT_SECRET: string };
  try {
    env = (await getCloudflareContext()).env as unknown as typeof env;
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }

  const session = await verifySession(
    getTokenFromCookie(req.headers.get("cookie")) ?? "",
    env.JWT_SECRET
  );
  if (!session) return new Response("Unauthorized", { status: 401 });

  const db = drizzle(env.DB, { schema });
  const doc = await db
    .select({
      r2Key: schema.documents.r2Key,
      mimeType: schema.documents.mimeType,
      originalName: schema.documents.originalName,
    })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, session.orgId)))
    .get();
  if (!doc) return new Response("Not found", { status: 404 });

  const obj = await env.DOCUMENTS.get(doc.r2Key);
  if (!obj) return new Response("File missing from storage", { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const safeName = doc.originalName.replace(/[^\w.\- ]/g, "_");

  return new Response(obj.body, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      // Private: the response is per-session; short TTL keeps thumbnails snappy.
      "Cache-Control": "private, max-age=300",
      // Never let the browser sniff-execute uploaded content.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
