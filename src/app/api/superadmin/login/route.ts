/**
 * POST /api/superadmin/login
 * Validates the SUPER_ADMIN_TOKEN and sets an HttpOnly sa_token cookie.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { timingSafeEqual } from "@/lib/timing-safe-equal";

export async function POST(req: Request): Promise<Response> {
  let expectedToken: string | undefined;
  try {
    const ctx = await getCloudflareContext();
    expectedToken = (ctx.env as { SUPER_ADMIN_TOKEN?: string }).SUPER_ADMIN_TOKEN;
  } catch {
    expectedToken = process.env.SUPER_ADMIN_TOKEN;
  }

  if (!expectedToken) {
    return Response.json({ ok: false, error: "Super admin not configured" }, { status: 503 });
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
