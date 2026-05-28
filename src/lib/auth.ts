import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

const sessionPayloadSchema = z.object({
  sub: z.string(),         // user ID
  orgId: z.string(),
  email: z.string().email(),
  role: z.string(),
  jti: z.string().optional(), // token id — used for KV revocation
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function getKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp" | "jti">,
  jwtSecret: string
): Promise<string> {
  // Every token gets a unique id so it can be individually revoked via KV.
  const jti = crypto.randomUUID();
  return new SignJWT({ ...payload, jti } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getKey(jwtSecret));
}

/** KV key prefix for revoked token ids. */
const REVOKED_PREFIX = "revoked:";

/** Mark a token id as revoked. TTL matches the remaining session lifetime. */
export async function revokeSession(
  kv: KVNamespace,
  jti: string
): Promise<void> {
  await kv.put(`${REVOKED_PREFIX}${jti}`, "1", {
    expirationTtl: SESSION_DURATION_SECONDS,
  });
}

/** Returns true if the token id has been revoked. */
export async function isSessionRevoked(
  kv: KVNamespace,
  jti: string
): Promise<boolean> {
  const hit = await kv.get(`${REVOKED_PREFIX}${jti}`);
  return hit !== null;
}

export async function verifySession(
  token: string,
  jwtSecret: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(jwtSecret));
    return sessionPayloadSchema.parse(payload);
  } catch {
    return null;
  }
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match?.[1] ?? null;
}

export function makeSessionCookie(token: string, secure: boolean): string {
  const attrs = [
    `session=${token}`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Path=/`,
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return attrs;
}

export function clearSessionCookie(): string {
  return "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
}

/** bcrypt isn't available in workerd — use PBKDF2 via SubtleCrypto instead. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = Uint8Array.from(
    (parts[1].match(/.{2}/g) ?? []).map((h) => parseInt(h, 16))
  );
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex === parts[2];
}
