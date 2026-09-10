import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  totpCode,
  verifyTotp,
  generateTotpSecret,
  otpauthUri,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from "@/lib/totp";

// RFC 6238 Appendix B test vector: ASCII secret "12345678901234567890", SHA-1.
const RFC_SECRET_B32 = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("base32", () => {
  it("round-trips bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });
  it("matches the RFC vector encoding", () => {
    expect(RFC_SECRET_B32).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });
});

describe("TOTP (RFC 6238 vectors, SHA-1, 6 digits)", () => {
  it.each([
    [59_000, "287082"],
    [1_111_111_109_000, "081804"],
    [1_234_567_890_000, "005924"],
  ])("time %i ms → %s", async (ms, expected) => {
    expect(await totpCode(RFC_SECRET_B32, ms)).toBe(expected);
  });

  it("verifies the current code and tolerates one step of drift either way", async () => {
    const t = 1_234_567_890_000;
    const now = await totpCode(RFC_SECRET_B32, t);
    expect(await verifyTotp(RFC_SECRET_B32, now, t)).toBe(true);
    expect(await verifyTotp(RFC_SECRET_B32, now, t + 30_000)).toBe(true); // one step later
    expect(await verifyTotp(RFC_SECRET_B32, now, t - 30_000)).toBe(true); // one step earlier
    expect(await verifyTotp(RFC_SECRET_B32, now, t + 90_000)).toBe(false); // three steps
  });

  it("rejects malformed and wrong codes", async () => {
    expect(await verifyTotp(RFC_SECRET_B32, "12345")).toBe(false);
    expect(await verifyTotp(RFC_SECRET_B32, "000000", 1_234_567_890_000)).toBe(false);
  });

  it("generates 160-bit secrets and a standard otpauth URI", () => {
    const s = generateTotpSecret();
    expect(base32Decode(s).length).toBe(20);
    const uri = otpauthUri(s, "owner@shop.com");
    expect(uri.startsWith("otpauth://totp/Successio%3Aowner%40shop.com?")).toBe(true);
    expect(uri).toContain(`secret=${s}`);
    expect(uri).toContain("issuer=Successio");
  });
});

describe("recovery codes", () => {
  it("issues 8 codes, stores only hashes, and consumes each exactly once", async () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    const hashes = await hashRecoveryCodes(codes);
    for (const h of hashes) expect(codes).not.toContain(h);

    const after = await consumeRecoveryCode(codes[3], hashes);
    expect(after).not.toBeNull();
    expect(after!).toHaveLength(7);
    // Same code again is rejected.
    expect(await consumeRecoveryCode(codes[3], after!)).toBeNull();
    // Case/format-insensitive entry works.
    expect(await consumeRecoveryCode(codes[0].toLowerCase().replace("-", " "), after!)).not.toBeNull();
    expect(await consumeRecoveryCode("NOPE-NOPE1", after!)).toBeNull();
  });
});
