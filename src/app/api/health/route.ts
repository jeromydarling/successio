/**
 * GET /api/health — authed stack health check.
 * Exercises each binding (D1, R2, KV, AI, Vectorize, Queue, Workflow) and
 * reports which secrets are present, then renders a green/red page so the whole
 * stack can be verified at a glance. Requires a valid session.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession, getTokenFromCookie } from "@/lib/auth";

interface HealthEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  SESSIONS?: KVNamespace;
  AI: Ai;
  VECTORS?: VectorizeIndex;
  DOCUMENT_QUEUE?: Queue;
  DOCUMENT_WORKFLOW?: { create: (...args: unknown[]) => unknown };
  BROWSER?: unknown;
  JWT_SECRET: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function check(name: string, fn: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(req: Request): Promise<Response> {
  let env: HealthEnv;
  try {
    const ctx = await getCloudflareContext();
    env = ctx.env as unknown as HealthEnv;
  } catch {
    return new Response("Bindings unavailable in this environment", { status: 503 });
  }

  const session = await verifySession(
    getTokenFromCookie(req.headers.get("cookie")) ?? "",
    env.JWT_SECRET
  );
  if (!session) {
    return new Response("Sign in to view the health check", { status: 401 });
  }

  const checks = await Promise.all([
    check("D1 (database)", async () => {
      const r = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      if (r?.ok !== 1) throw new Error("unexpected result");
      return "SELECT 1 ok";
    }),
    check("R2 (documents)", async () => {
      const list = await env.DOCUMENTS.list({ limit: 1 });
      return `bucket reachable (${list.objects.length} object sampled)`;
    }),
    check("KV (sessions / rate limit)", async () => {
      if (!env.SESSIONS) throw new Error("SESSIONS not bound");
      await env.SESSIONS.get("__health__");
      return "namespace reachable";
    }),
    check("Workers AI (Llama / embeddings)", async () => {
      const r = (await (env.AI as unknown as { run: (m: string, i: unknown) => Promise<{ data?: number[][] }> }).run(
        "@cf/baai/bge-base-en-v1.5",
        { text: ["health check"] }
      ));
      const dims = r.data?.[0]?.length ?? 0;
      if (!dims) throw new Error("no embedding returned");
      return `embeddings ok (${dims} dims)`;
    }),
    check("Vectorize (semantic search)", async () => {
      if (!env.VECTORS) throw new Error("VECTORS not bound");
      const info = await (env.VECTORS as unknown as { describe: () => Promise<{ dimensions?: number; vectorsCount?: number }> }).describe();
      return `index ok (${info.dimensions ?? "?"} dims, ${info.vectorsCount ?? 0} vectors)`;
    }),
    check("Queue (document-jobs)", async () => {
      if (typeof env.DOCUMENT_QUEUE?.send !== "function") throw new Error("DOCUMENT_QUEUE not bound");
      return "producer bound";
    }),
    check("Workflow (document-pipeline)", async () => {
      if (typeof env.DOCUMENT_WORKFLOW?.create !== "function") throw new Error("DOCUMENT_WORKFLOW not bound");
      return "binding present";
    }),
    check("Browser Rendering (PDF OCR)", async () => {
      if (!env.BROWSER) throw new Error("not enabled (scanned-PDF OCR falls back to review)");
      return "binding present";
    }),
    check("Secret: JWT_SECRET", async () => (env.JWT_SECRET ? "set" : (() => { throw new Error("missing"); })())),
    check("Secret: R2_ACCESS_KEY_ID", async () => (env.R2_ACCESS_KEY_ID ? "set" : (() => { throw new Error("missing — uploads will fail"); })())),
    check("Secret: R2_SECRET_ACCESS_KEY", async () => (env.R2_SECRET_ACCESS_KEY ? "set" : (() => { throw new Error("missing — uploads will fail"); })())),
  ]);

  const allOk = checks.every((c) => c.ok);
  const wantsJson = (req.headers.get("accept") ?? "").includes("application/json");
  if (wantsJson) {
    return Response.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
  }

  const rows = checks
    .map(
      (c) => `<tr>
        <td class="dot"><span class="${c.ok ? "g" : "r"}"></span></td>
        <td class="name">${c.name}</td>
        <td class="detail">${escapeHtml(c.detail)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Successio · Health</title>
  <style>
    body{background:#0a0c10;color:#e7ecf3;font:15px/1.5 ui-sans-serif,system-ui,sans-serif;margin:0;padding:48px 20px}
    .wrap{max-width:720px;margin:0 auto}
    h1{font-size:20px;font-weight:600;margin:0 0 4px}
    .sub{color:#9aa6b6;font-size:13px;margin:0 0 24px}
    .status{display:inline-block;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;margin-bottom:20px}
    .status.ok{background:rgba(52,211,153,.15);color:#34d399}
    .status.bad{background:rgba(248,113,113,.15);color:#f87171}
    table{width:100%;border-collapse:collapse}
    td{padding:12px 8px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
    .dot{width:24px}.name{font-weight:500;white-space:nowrap}
    .detail{color:#9aa6b6;font-family:ui-monospace,monospace;font-size:12px}
    .g,.r{display:inline-block;width:10px;height:10px;border-radius:999px}
    .g{background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.6)}
    .r{background:#f87171;box-shadow:0 0 8px rgba(248,113,113,.6)}
  </style></head><body><div class="wrap">
    <h1>Stack health</h1>
    <p class="sub">${new Date().toISOString()}</p>
    <div class="status ${allOk ? "ok" : "bad"}">${allOk ? "All systems go" : "Attention needed"}</div>
    <table>${rows}</table>
  </div></body></html>`;

  return new Response(html, {
    status: allOk ? 200 : 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}
