/**
 * GET /api/processing-stream
 * Authenticated Server-Sent Events proxy. Connects the signed-in user's
 * browser to their org's ProcessingStateDO, which emits an event whenever the
 * pipeline finishes a document and the readiness score changes.
 *
 * The dashboard opens an EventSource here and invalidates its queries on each
 * message, replacing brute-force polling.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession, getTokenFromCookie } from "@/lib/auth";

interface StreamEnv {
  JWT_SECRET: string;
  PROCESSING_STATE?: DurableObjectNamespace;
}

export async function GET(req: Request): Promise<Response> {
  let env: StreamEnv;
  try {
    const ctx = await getCloudflareContext();
    env = ctx.env as unknown as StreamEnv;
  } catch {
    return new Response("Streaming unavailable in this environment", { status: 503 });
  }

  const session = await verifySession(
    getTokenFromCookie(req.headers.get("cookie")) ?? "",
    env.JWT_SECRET
  );
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!env.PROCESSING_STATE) {
    return new Response("Realtime not configured", { status: 503 });
  }

  // Route to the org's DO instance and return its SSE stream directly.
  const stub = env.PROCESSING_STATE.get(
    env.PROCESSING_STATE.idFromName(`org_${session.orgId}`)
  );
  return stub.fetch("https://do/stream", {
    headers: { Accept: "text/event-stream" },
  });
}
