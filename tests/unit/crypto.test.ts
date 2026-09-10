import { describe, it, expect } from "vitest";
import { encryptField, decryptField, decryptNullable, isEncrypted, hasDedicatedKey } from "@/lib/crypto";

const withKey = { ENCRYPTION_KEY: "test-key-0123456789abcdef", JWT_SECRET: "jwt-secret-xyz" };
const derivedOnly = { JWT_SECRET: "jwt-secret-xyz" };

describe("field encryption", () => {
  it("round-trips text and produces a tagged, non-plaintext ciphertext", async () => {
    const plain = "Profit & Loss 2023 — Revenue 6,240,000 · Owner comp 240,000";
    const ct = await encryptField(withKey, plain);
    expect(isEncrypted(ct)).toBe(true);
    expect(ct.startsWith("enc:v1:")).toBe(true);
    expect(ct).not.toContain("6,240,000");
    expect(await decryptField(withKey, ct)).toBe(plain);
  });

  it("uses a fresh IV every time (same input → different ciphertext)", async () => {
    const a = await encryptField(withKey, "same");
    const b = await encryptField(withKey, "same");
    expect(a).not.toBe(b);
  });

  it("passes legacy plaintext rows through unchanged", async () => {
    expect(await decryptField(withKey, "not encrypted")).toBe("not encrypted");
    expect(await decryptNullable(withKey, null)).toBeNull();
  });

  it("works with only JWT_SECRET (derived key) and reports no dedicated key", async () => {
    expect(hasDedicatedKey(derivedOnly)).toBe(false);
    const ct = await encryptField(derivedOnly, "hello");
    expect(await decryptField(derivedOnly, ct)).toBe("hello");
  });

  it("keeps old rows readable after ENCRYPTION_KEY is introduced (key ring by kid)", async () => {
    const oldCt = await encryptField(derivedOnly, "written before the key existed");
    // Later: the operator sets ENCRYPTION_KEY. Same JWT_SECRET stays in the ring.
    expect(await decryptField(withKey, oldCt)).toBe("written before the key existed");
    // New writes use the dedicated key — a different kid than the derived one.
    const newCt = await encryptField(withKey, "x");
    expect(newCt.split(":")[2]).not.toBe(oldCt.split(":")[2]);
  });

  it("refuses to decrypt with a ring that lacks the producing key", async () => {
    const ct = await encryptField(withKey, "secret");
    await expect(decryptField({ JWT_SECRET: "a-different-secret" }, ct)).rejects.toThrow(/no key for kid/);
  });

  it("detects tampering (GCM auth tag)", async () => {
    const ct = await encryptField(withKey, "secret");
    const tampered = ct.slice(0, -4) + (ct.endsWith("AAAA") ? "BBBB" : "AAAA");
    await expect(decryptField(withKey, tampered)).rejects.toThrow();
  });

  it("handles large payloads (multi-chunk base64 path)", async () => {
    const big = "x".repeat(300_000);
    const ct = await encryptField(withKey, big);
    expect(await decryptField(withKey, ct)).toBe(big);
  });

  it("throws when no key material exists at all", async () => {
    await expect(encryptField({}, "x")).rejects.toThrow(/no encryption key material/);
  });
});
