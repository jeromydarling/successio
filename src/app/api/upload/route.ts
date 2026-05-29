/**
 * POST /api/upload?documentId=... — stream a file to R2 through the Worker.
 *
 * Avoids needing R2 S3 credentials (presigned URLs): the browser posts the file
 * here and we write it to the R2 bucket via the binding. The document row is
 * created first by documents.requestUpload; this only stores the bytes.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { verifySession, getTokenFromCookie } from "@/lib/auth";

export async function POST(req: Request): Promise<Response> {
  // Same-origin guard (mirrors the tRPC handler) — SameSite=Strict already
  // prevents the session cookie from being sent cross-site, but be explicit.
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return new Response("Forbidden", { status: 403 });
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }
  const e = env as unknown as { DB: D1Database; DOCUMENTS: R2Bucket; JWT_SECRET: string };

  const session = await verifySession(getTokenFromCookie(req.headers.get("cookie")) ?? "", e.JWT_SECRET);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const documentId = new URL(req.url).searchParams.get("documentId");
  if (!documentId) return new Response("Missing documentId", { status: 400 });

  const db = drizzle(e.DB, { schema });
  const doc = await db
    .select({ r2Key: schema.documents.r2Key, mimeType: schema.documents.mimeType })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.orgId, session.orgId)))
    .get();
  if (!doc) return new Response("Document not found", { status: 404 });

  const body = await req.arrayBuffer();
  if (body.byteLength === 0) return new Response("Empty body", { status: 400 });

  await e.DOCUMENTS.put(doc.r2Key, body, {
    httpMetadata: { contentType: doc.mimeType || "application/octet-stream" },
  });

  return new Response(null, { status: 204 });
}
