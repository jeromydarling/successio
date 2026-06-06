/**
 * Shared guard for the token-protected E2E admin endpoints (purge, seed).
 *
 * Both endpoints are gated two ways: a token (env secret or known CI fallback)
 * AND an "e2e+" email allowlist, so even with the fallback token they can only
 * ever touch throwaway test accounts — never a real customer.
 */

/** Known fallback so CI can run without provisioning a Cloudflare secret. */
export const E2E_FALLBACK_TOKEN = "successio-e2e-purge-2026";

/** Only test accounts (e2e+...) are ever eligible. */
const E2E_EMAIL = /^e2e\+/i;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
  const expected = envToken || E2E_FALLBACK_TOKEN;
  if (!token || !timingSafeEqual(token, expected)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!E2E_EMAIL.test(email)) {
    return { ok: false, status: 400, error: "Only e2e+ test accounts are allowed" };
  }
  return { ok: true };
}
