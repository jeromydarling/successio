/**
 * Per-account security audit log. Every auth-relevant action is recorded so
 * the owner can see it in Settings → Security ("was that me?") and so we can
 * investigate incidents. Always best-effort: logging must never break the
 * action being logged.
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { sha256Hex } from "@/lib/rate-limit";

export type SecurityEventType =
  | "login"
  | "login_failed"
  | "new_device_login"
  | "mfa_challenge_failed"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "recovery_code_used"
  | "session_revoked"
  | "sessions_revoked_all"
  | "share_link_created"
  | "share_link_revoked"
  | "data_exported"
  | "account_deletion_requested"
  | "email_verified";

/** Plain-English labels for the Settings activity list. */
export const SECURITY_EVENT_LABELS: Record<SecurityEventType, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in attempt",
  new_device_login: "Signed in from a new device",
  mfa_challenge_failed: "Wrong two-factor code entered",
  logout: "Signed out",
  password_reset_requested: "Password reset requested",
  password_changed: "Password changed",
  mfa_enabled: "Two-factor authentication turned on",
  mfa_disabled: "Two-factor authentication turned off",
  recovery_code_used: "Recovery code used to sign in",
  session_revoked: "A device was signed out",
  sessions_revoked_all: "Signed out of all other devices",
  share_link_created: "Share link created",
  share_link_revoked: "Share link revoked",
  data_exported: "Data export downloaded",
  account_deletion_requested: "Account deletion requested",
  email_verified: "Email address verified",
};

type Db = DrizzleD1Database<typeof schema>;

/** IP is stored only as a one-way hash; UA is truncated. */
export async function requestFingerprint(
  req: Request | undefined
): Promise<{ ipHash: string | null; userAgent: string | null }> {
  if (!req) return { ipHash: null, userAgent: null };
  const ip = req.headers.get("cf-connecting-ip");
  const ua = req.headers.get("user-agent");
  return {
    ipHash: ip ? (await sha256Hex(ip)).slice(0, 32) : null,
    userAgent: ua ? ua.slice(0, 200) : null,
  };
}

/** A short, human device label from a user-agent string. */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

export async function logSecurityEvent(
  db: Db,
  e: {
    type: SecurityEventType;
    userId?: string | null;
    orgId?: string | null;
    req?: Request;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const fp = await requestFingerprint(e.req);
    await db.insert(schema.securityEvents).values({
      id: nanoid(),
      userId: e.userId ?? null,
      orgId: e.orgId ?? null,
      type: e.type,
      ipHash: fp.ipHash,
      userAgent: fp.userAgent,
      meta: e.meta ? JSON.stringify(e.meta) : null,
    });
  } catch (err) {
    console.error("[security-events] failed to log", e.type, err);
  }
}
