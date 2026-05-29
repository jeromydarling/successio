/**
 * GET /api/profile-pdf — stream the caller's generated deal-room PDF from R2
 * through the Worker (no S3 presigned URL / credentials needed).
 *
 * profiles.exportPdf renders the PDF, stores it in R2, and records pdfR2Key;
 * this route serves those bytes for the authenticated org.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import * as schema from "@/db/schema";
import { verifySession, getTokenFromCookie } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }
  const e = env as unknown as { DB: D1Database; DOCUMENTS: R2Bucket; JWT_SECRET: string };

  const session = await verifySession(getTokenFromCookie(req.headers.get("cookie")) ?? "", e.JWT_SECRET);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const db = drizzle(e.DB, { schema });
  const profile = await db
    .select({ pdfR2Key: schema.businessProfiles.pdfR2Key })
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.orgId, session.orgId))
    .orderBy(desc(schema.businessProfiles.createdAt))
    .get();

  if (!profile?.pdfR2Key) {
    return new Response("No exported PDF — generate one first", { status: 404 });
  }

  const obj = await e.DOCUMENTS.get(profile.pdfR2Key);
  if (!obj) return new Response("PDF not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="business-profile.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
