/**
 * Lightweight KV-backed rate limiter for public, unauthenticated endpoints
 * (share links, NDA submissions). KV has no atomic increment, so this is a
 * best-effort fixed window — adequate to blunt scripted abuse, not a hard
 * guarantee. For strict limits, front the route with a Cloudflare Rate
 * Limiting rule.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function rateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const k = `rl:${key}`;
  const current = await kv.get(k);
  const count = current ? parseInt(current, 10) || 0 : 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(k, String(count + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: limit - count - 1 };
}

/** SHA-256 hash of a string, hex-encoded. Used to store IPs without PII. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
