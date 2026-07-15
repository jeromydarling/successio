/**
 * POST /api/superadmin/login
 * Validates the SUPER_ADMIN_TOKEN and sets an HttpOnly sa_token cookie.
 * Rate-limited per IP so the token can't be brute-forced.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { timingSafeEqual } from "@/lib/timing-safe-equal";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";

export async function POST(req: Request): Promise<Response> {
  let expectedToken: string | undefined;
  let kv: KVNamespace | undefined;
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as { SUPER_ADMIN_TOKEN?: string; SESSIONS?: KVNamespace };
    expectedToken = env.SUPER_ADMIN_TOKEN;
    kv = env.SESSIONS;
  } catch {
    expectedToken = process.env.SUPER_ADMIN_TOKEN;
  }

  if (!expectedToken) {
    return Response.json({ ok: false, error: "Super admin not configured" }, { status: 503 });
  }

  // 5 attempts per 5 minutes per IP.
  if (kv) {
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { allowed } = await rateLimit(kv, `sa-login:${await sha256Hex(ip)}`, 5, 300);
    if (!allowed) {
      return Response.json({ ok: false, error: "Too many attempts — wait a few minutes" }, { status: 429 });
    }
  }

  let token = "";
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token ?? "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!token || !timingSafeEqual(token, expectedToken)) {
    return Response.json({ ok: false, error: "Invalid token" }, { status: 403 });
  }

  const res = Response.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `sa_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  );
  return res;
}

export async function DELETE(): Promise<Response> {
  const res = Response.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    "sa_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );
  return res;
}
