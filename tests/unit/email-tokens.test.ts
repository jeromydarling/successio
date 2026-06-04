import { describe, it, expect } from "vitest";
import { generateRawToken, hashToken, expiryFor, TOKEN_TTL } from "@/lib/email/tokens";

describe("email tokens", () => {
  it("generates high-entropy, unique raw tokens", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes deterministically and differs per token", async () => {
    const raw = generateRawToken();
    const h1 = await hashToken(raw);
    const h2 = await hashToken(raw);
    expect(h1).toBe(h2); // same input → same hash (lookup works)
    expect(h1).toHaveLength(64); // SHA-256 hex
    expect(await hashToken(generateRawToken())).not.toBe(h1);
  });

  it("never stores the raw token (hash != raw)", async () => {
    const raw = generateRawToken();
    expect(await hashToken(raw)).not.toBe(raw);
  });

  it("expiry respects per-kind TTL", () => {
    const now = Date.now();
    const reset = expiryFor("password_reset").getTime();
    const verify = expiryFor("email_verify").getTime();
    expect(reset).toBeGreaterThan(now);
    expect(Math.round((reset - now) / 1000)).toBeCloseTo(TOKEN_TTL.password_reset, -1);
    expect(verify).toBeGreaterThan(reset); // 24h > 1h
  });
});
