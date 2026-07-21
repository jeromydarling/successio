/**
 * GET /api/email/unsubscribe?org=<orgId>[&type=views]
 * One-click unsubscribe (CAN-SPAM). Default turns off re-engagement reminders;
 * type=views turns off the deal-room view digest. The org id is an unguessable
 * nanoid delivered only inside the org's own email, so possession of the link
 * is the credential. Worst case for a leaked link: notifications get turned
 * OFF for that org — never on.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org") ?? "";
  const type = url.searchParams.get("type") ?? "reminders";
  if (!orgId || orgId.length > 64) {
    return new Response("Invalid unsubscribe link", { status: 400 });
  }

  let env: { DB: D1Database };
  try {
    env = (await getCloudflareContext()).env as unknown as typeof env;
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }

  const db = drizzle(env.DB, { schema });
  const isViews = type === "views";
  await db
    .update(schema.organizations)
    .set(isViews ? { viewDigestOptOut: true } : { churnOptOut: true })
    .where(eq(schema.organizations.id, orgId));

  const what = isViews ? "deal-room view notifications" : "reminder emails";
  // Idempotent + non-enumerating: same friendly page whether or not the id
  // matched anything.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed — Successio</title>
  <style>body{background:#0a0c10;color:#e7ecf3;font:16px/1.6 ui-sans-serif,system-ui,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{max-width:420px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#9aa6b6;font-size:14px;margin:0 0 20px}
  a{color:#fbbf24;text-decoration:none;font-weight:600}</style></head><body>
  <div class="card"><h1>You're unsubscribed</h1>
  <p>We won't send you any more ${what}. Account emails you rely on — password resets, security alerts, processing notifications — still work normally.</p>
  <a href="/dashboard">Back to your dashboard →</a></div></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
