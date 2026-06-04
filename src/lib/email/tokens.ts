/**
 * Single-use email-flow tokens (password reset, email verification).
 * The raw token goes only in the emailed link; only its SHA-256 hash is stored,
 * so a database leak can't be used to reset passwords.
 */

import { nanoid } from "@/lib/nanoid";

export const TOKEN_TTL = {
  password_reset: 60 * 60, // 1 hour
  email_verify: 60 * 60 * 24, // 24 hours
} as const;

export type TokenKind = keyof typeof TOKEN_TTL;

/** Generate a high-entropy URL-safe raw token. */
export function generateRawToken(): string {
  return nanoid(43); // ~256 bits
}

/** SHA-256 hash (hex) of a raw token — what we store and look up by. */
export async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Seconds-from-now Date for a token kind's expiry. */
export function expiryFor(kind: TokenKind): Date {
  return new Date(Date.now() + TOKEN_TTL[kind] * 1000);
}
