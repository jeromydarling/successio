import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  getTokenFromCookie,
  makeSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";

const SECRET = "test-jwt-secret-at-least-32-characters!!";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("hunter2hunter2");
    expect(hash.startsWith("pbkdf2:")).toBe(true);
    expect(await verifyPassword("hunter2hunter2", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a unique salt per hash", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:aa:bb")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

describe("session JWT", () => {
  const payload = { sub: "u1", orgId: "o1", email: "a@b.com", role: "owner" };

  it("round-trips a signed session", async () => {
    const token = await signSession(payload, SECRET);
    const session = await verifySession(token, SECRET);
    expect(session).not.toBeNull();
    expect(session!.sub).toBe("u1");
    expect(session!.orgId).toBe("o1");
    expect(session!.jti).toBeTruthy(); // every token gets a revocable id
    expect(session!.demo).toBeUndefined();
  });

  it("preserves the demo flag used to enforce read-only demo sessions", async () => {
    const token = await signSession({ ...payload, demo: true }, SECRET);
    const session = await verifySession(token, SECRET);
    expect(session!.demo).toBe(true);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(payload, SECRET);
    expect(await verifySession(token, "another-secret-also-32-characters!!!")).toBeNull();
  });

  it("rejects garbage tokens", async () => {
    expect(await verifySession("not.a.jwt", SECRET)).toBeNull();
    expect(await verifySession("", SECRET)).toBeNull();
  });
});

describe("session cookie", () => {
  it("extracts the session token from a cookie header", () => {
    expect(getTokenFromCookie("session=abc123; theme=dark")).toBe("abc123");
    expect(getTokenFromCookie("theme=dark; session=xyz")).toBe("xyz");
    expect(getTokenFromCookie("theme=dark")).toBeNull();
    expect(getTokenFromCookie(null)).toBeNull();
  });

  it("does not match cookies whose name merely ends in 'session'", () => {
    expect(getTokenFromCookie("adminsession=evil")).toBeNull();
  });

  it("sets HttpOnly + SameSite=Strict, and Secure only when asked", () => {
    const secure = makeSessionCookie("tok", true);
    expect(secure).toContain("HttpOnly");
    expect(secure).toContain("SameSite=Strict");
    expect(secure).toContain("Secure");
    const insecure = makeSessionCookie("tok", false);
    expect(insecure).not.toContain("Secure");
  });

  it("clears the cookie with Max-Age=0", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});
