/**
 * Shared guard for the token-protected E2E admin endpoints (purge, seed).
 *
 * Both endpoints are gated two ways: the E2E_ADMIN_TOKEN secret AND an "e2e+"
 * email allowlist, so they can only ever touch throwaway test accounts —
 * never a real customer. If the secret is not configured, the endpoints are
 * disabled entirely (403) — there is deliberately no fallback token.
 */

/** Only test accounts (e2e+...) are ever eligible. */
const E2E_EMAIL = /^e2e\+/i;

import { timingSafeEqual } from "@/lib/timing-safe-equal";

/** Read token + email from the query string or a JSON body (body preferred — a
 *  "+" in an email survives there, where query parsing would make it a space). */
export async function readE2eCreds(req: Request): Promise<{ token: string; email: string }> {
  const url = new URL(req.url);
  let token = url.searchParams.get("token") ?? "";
  let email = url.searchParams.get("email") ?? "";
  if (!token || !email) {
    try {
      const body = (await req.json()) as { token?: string; email?: string };
      token = token || body.token || "";
      email = email || body.email || "";
    } catch {
      /* no/invalid JSON body — fall through with whatever the query gave us */
    }
  }
  return { token, email: email.toLowerCase() };
}

export function checkE2eAuth(
  envToken: string | undefined,
  token: string,
  email: string
): { ok: true } | { ok: false; status: number; error: string } {
  // No secret configured → the E2E endpoints are off. Fail closed.
  if (!envToken) {
    return { ok: false, status: 403, error: "E2E endpoints are not enabled" };
  }
  if (!token || !timingSafeEqual(token, envToken)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!E2E_EMAIL.test(email)) {
    return { ok: false, status: 400, error: "Only e2e+ test accounts are allowed" };
  }
  return { ok: true };
}
