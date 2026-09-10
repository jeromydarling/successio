/**
 * TOTP two-factor authentication (RFC 6238) on WebCrypto — no dependencies.
 * SHA-1 / 6 digits / 30-second steps, which is what every authenticator app
 * (Google Authenticator, 1Password, Authy…) expects by default.
 */

import { sha256Hex } from "@/lib/rate-limit";
import { timingSafeEqual } from "@/lib/timing-safe-equal";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array<ArrayBuffer> {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** 160-bit secret, base32 — the size authenticator apps are built around. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

async function hotp(secretB32: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secretB32),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const msg = new Uint8Array(8);
  // Big-endian 64-bit counter; JS numbers are safe well past any real epoch.
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const code =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export async function totpCode(secretB32: string, nowMs = Date.now()): Promise<string> {
  return hotp(secretB32, Math.floor(nowMs / 1000 / 30));
}

/** Accepts the current step ±1 (clock drift). Constant-time compare. */
export async function verifyTotp(
  secretB32: string,
  code: string,
  nowMs = Date.now()
): Promise<boolean> {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return false;
  const step = Math.floor(nowMs / 1000 / 30);
  for (const delta of [0, -1, 1]) {
    const expected = await hotp(secretB32, step + delta);
    if (timingSafeEqual(expected, digits)) return true;
  }
  return false;
}

export function otpauthUri(secretB32: string, accountEmail: string, issuer = "Successio"): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Eight single-use recovery codes, shown once; only their hashes are stored. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const raw = base32Encode(crypto.getRandomValues(new Uint8Array(10))).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => sha256Hex(normalizeRecoveryCode(c))));
}

/** Returns the remaining hashes if `code` matched one (consuming it), else null. */
export async function consumeRecoveryCode(
  code: string,
  storedHashes: string[]
): Promise<string[] | null> {
  const h = await sha256Hex(normalizeRecoveryCode(code));
  const idx = storedHashes.findIndex((s) => timingSafeEqual(s, h));
  if (idx === -1) return null;
  return storedHashes.filter((_, i) => i !== idx);
}
