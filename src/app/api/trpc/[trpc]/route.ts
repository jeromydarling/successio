import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { createContext } from "@/server/trpc";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * CSRF defense: reject cross-origin state-changing requests. tRPC mutations are
 * POSTs, so we require the Origin (or Referer) to match the request host. This
 * complements the SameSite=Strict session cookie.
 */
function isCrossOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const host = req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false; // non-browser client (no Origin) — allow
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

async function handler(req: Request): Promise<Response> {
  if (isCrossOrigin(req)) {
    return Response.json(
      { error: "Cross-origin request blocked" },
      { status: 403 }
    );
  }

  // In production (Cloudflare Workers), bindings come from the runtime context.
  // In local Next.js dev, they may be absent — the handler degrades gracefully.
  let env: Record<string, unknown>;
  try {
    const ctx = await getCloudflareContext();
    env = ctx.env as Record<string, unknown>;
  } catch {
    // Local Next.js dev without wrangler — use process.env stubs
    env = {
      JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-at-least-32-chars-long!!",
      CF_AI_GATEWAY_ID: process.env.CF_AI_GATEWAY_ID ?? "successio-prod",
      ENVIRONMENT: "development",
    };
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ req }) => createContext(req, env as any),
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[tRPC] ${path}:`, error);
      }
    },
  });
}

export { handler as GET, handler as POST };
