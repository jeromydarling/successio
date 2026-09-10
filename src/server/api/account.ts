/**
 * Account security & privacy — the controls an owner can see and operate:
 * two-factor auth, active devices, the security activity log, a complete
 * data export, and account deletion. Everything here is user-facing trust.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, gt, isNull } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import * as schema from "@/db/schema";
import { verifyPassword, revokeSession } from "@/lib/auth";
import { encryptField, decryptField, decryptNullable, hasDedicatedKey } from "@/lib/crypto";
import {
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from "@/lib/totp";
import {
  logSecurityEvent,
  describeDevice,
  SECURITY_EVENT_LABELS,
  type SecurityEventType,
} from "@/lib/security-events";
import { purgeOrgs } from "@/lib/purge-org";
import { getEmailSender } from "@/lib/email/sender";
import { securityAlertEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

const {
  users,
  sessions,
  securityEvents,
  organizations,
  documents,
  extractedEntities,
  customers,
  equipment,
  employees,
  financials,
  processes,
  orgMilestones,
  businessProfiles,
  shareTokens,
  shareViews,
  documentRequests,
  readinessScores,
} = schema;

async function loadUser(ctx: { db: any; session: { sub: string } }) {
  const user = await ctx.db.select().from(users).where(eq(users.id, ctx.session.sub)).get();
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return user as typeof users.$inferSelect;
}

async function sendAlert(
  ctx: { env: any },
  to: string,
  name: string | undefined,
  headline: string,
  detail: string
) {
  try {
    const mail = securityAlertEmail({
      name,
      headline,
      detail,
      url: `${appUrl(ctx.env)}/settings`,
    });
    await getEmailSender(ctx.env).send({ to, ...mail });
  } catch (err) {
    console.error("[account] security alert email failed:", err);
  }
}

export const accountRouter = router({
  /** Everything the Settings → Security card needs in one round-trip. */
  securityOverview: protectedProcedure.query(async ({ ctx }) => {
    const user = await loadUser(ctx);
    const now = new Date();

    const activeSessions = await ctx.db
      .select({
        id: sessions.id,
        jti: sessions.jti,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        lastSeenAt: sessions.lastSeenAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt))
      .limit(25)
      .all();

    const events = await ctx.db
      .select({
        id: securityEvents.id,
        type: securityEvents.type,
        userAgent: securityEvents.userAgent,
        createdAt: securityEvents.createdAt,
      })
      .from(securityEvents)
      .where(eq(securityEvents.userId, user.id))
      .orderBy(desc(securityEvents.createdAt))
      .limit(40)
      .all();

    return {
      email: user.email,
      totpEnabled: !!user.totpEnabledAt,
      totpPending: !!user.totpSecret && !user.totpEnabledAt,
      passwordChangedAt: user.passwordChangedAt,
      encryption: {
        appLayer: true,
        dedicatedKey: hasDedicatedKey(ctx.env),
      },
      sessions: activeSessions.map((s) => ({
        id: s.id,
        device: describeDevice(s.userAgent),
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        current: !!s.jti && s.jti === ctx.session.jti,
      })),
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        label: SECURITY_EVENT_LABELS[e.type as SecurityEventType] ?? e.type,
        device: describeDevice(e.userAgent),
        createdAt: e.createdAt,
      })),
    };
  }),

  // ── Two-factor authentication ─────────────────────────────────────────────

  /** Step 1: mint a secret and hand back the otpauth URI for the QR code.
   *  Stored (encrypted) with totpEnabledAt=null = pending until confirmed. */
  beginTotpEnrollment: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await loadUser(ctx);
    if (user.totpEnabledAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor authentication is already on." });
    }
    const secret = generateTotpSecret();
    await ctx.db
      .update(users)
      .set({ totpSecret: await encryptField(ctx.env, secret) })
      .where(eq(users.id, user.id));
    return { secret, uri: otpauthUri(secret, user.email) };
  }),

  /** Step 2: prove the authenticator works, then switch it on and issue
   *  recovery codes (shown exactly once — only hashes are stored). */
  confirmTotpEnrollment: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(8) }))
    .mutation(async ({ input, ctx }) => {
      const user = await loadUser(ctx);
      if (!user.totpSecret || user.totpEnabledAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start enrollment first." });
      }
      const secret = await decryptField(ctx.env, user.totpSecret);
      if (!(await verifyTotp(secret, input.code))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match. Check the time on your phone and try again." });
      }
      const codes = generateRecoveryCodes();
      await ctx.db
        .update(users)
        .set({
          totpEnabledAt: new Date(),
          recoveryCodes: JSON.stringify(await hashRecoveryCodes(codes)),
        })
        .where(eq(users.id, user.id));
      await logSecurityEvent(ctx.db, { type: "mfa_enabled", userId: user.id, orgId: user.orgId, req: ctx.req });
      await sendAlert(
        ctx,
        user.email,
        user.name,
        "Two-factor authentication is on",
        "Signing in to your Successio account now requires a code from your authenticator app. If you didn't do this, reset your password immediately."
      );
      return { recoveryCodes: codes };
    }),

  /** Turning it off requires the password AND a current code (or recovery code). */
  disableTotp: protectedProcedure
    .input(z.object({ password: z.string().min(1), code: z.string().min(6).max(12) }))
    .mutation(async ({ input, ctx }) => {
      const user = await loadUser(ctx);
      if (!user.totpEnabledAt || !user.totpSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor authentication isn't on." });
      }
      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
      }
      const secret = await decryptField(ctx.env, user.totpSecret);
      const stored: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
      const ok = (await verifyTotp(secret, input.code)) || (await consumeRecoveryCode(input.code, stored)) !== null;
      if (!ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match." });
      }
      await ctx.db
        .update(users)
        .set({ totpSecret: null, totpEnabledAt: null, recoveryCodes: null })
        .where(eq(users.id, user.id));
      await logSecurityEvent(ctx.db, { type: "mfa_disabled", userId: user.id, orgId: user.orgId, req: ctx.req });
      await sendAlert(
        ctx,
        user.email,
        user.name,
        "Two-factor authentication was turned off",
        "Your account no longer requires an authenticator code to sign in. If you didn't do this, reset your password immediately and turn two-factor back on."
      );
      return { ok: true };
    }),

  regenerateRecoveryCodes: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(8) }))
    .mutation(async ({ input, ctx }) => {
      const user = await loadUser(ctx);
      if (!user.totpEnabledAt || !user.totpSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Two-factor authentication isn't on." });
      }
      const secret = await decryptField(ctx.env, user.totpSecret);
      if (!(await verifyTotp(secret, input.code))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match." });
      }
      const codes = generateRecoveryCodes();
      await ctx.db
        .update(users)
        .set({ recoveryCodes: JSON.stringify(await hashRecoveryCodes(codes)) })
        .where(eq(users.id, user.id));
      return { recoveryCodes: codes };
    }),

  // ── Sessions / devices ────────────────────────────────────────────────────

  revokeSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const row = await ctx.db
        .select({ id: sessions.id, jti: sessions.jti })
        .from(sessions)
        .where(and(eq(sessions.id, input.id), eq(sessions.userId, ctx.session.sub)))
        .get();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.jti && ctx.env.SESSIONS) await revokeSession(ctx.env.SESSIONS, row.jti);
      await ctx.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, row.id));
      await logSecurityEvent(ctx.db, { type: "session_revoked", userId: ctx.session.sub, orgId: ctx.session.orgId, req: ctx.req });
      return { ok: true, signedOutSelf: !!row.jti && row.jti === ctx.session.jti };
    }),

  /** Sign out every device except this one. */
  revokeAllOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: sessions.id, jti: sessions.jti })
      .from(sessions)
      .where(and(eq(sessions.userId, ctx.session.sub), isNull(sessions.revokedAt)))
      .all();
    let count = 0;
    for (const r of rows) {
      if (r.jti && r.jti === ctx.session.jti) continue;
      if (r.jti && ctx.env.SESSIONS) await revokeSession(ctx.env.SESSIONS, r.jti);
      await ctx.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, r.id));
      count++;
    }
    await logSecurityEvent(ctx.db, { type: "sessions_revoked_all", userId: ctx.session.sub, orgId: ctx.session.orgId, req: ctx.req, meta: { count } });
    return { count };
  }),

  // ── Data export ───────────────────────────────────────────────────────────

  /** Everything we hold about the business, as one JSON document. Document
   *  files themselves are listed with authenticated download paths. */
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const env = ctx.env;
    const by = (t: any) => eq(t.orgId, orgId);

    const [org, members, docs, entities, cust, equip, emps, fin, procs, miles, profiles, tokens, views, requests, scores] =
      await Promise.all([
        ctx.db.select().from(organizations).where(eq(organizations.id, orgId)).get(),
        ctx.db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).where(by(users)).all(),
        ctx.db.select().from(documents).where(by(documents)).all(),
        ctx.db.select().from(extractedEntities).where(by(extractedEntities)).all(),
        ctx.db.select().from(customers).where(by(customers)).all(),
        ctx.db.select().from(equipment).where(by(equipment)).all(),
        ctx.db.select().from(employees).where(by(employees)).all(),
        ctx.db.select().from(financials).where(by(financials)).all(),
        ctx.db.select().from(processes).where(by(processes)).all(),
        ctx.db.select().from(orgMilestones).where(by(orgMilestones)).all(),
        ctx.db.select().from(businessProfiles).where(by(businessProfiles)).all(),
        ctx.db.select().from(shareTokens).where(by(shareTokens)).all(),
        ctx.db.select().from(shareViews).where(by(shareViews)).all(),
        ctx.db.select().from(documentRequests).where(by(documentRequests)).all(),
        ctx.db.select().from(readinessScores).where(by(readinessScores)).all(),
      ]);

    const documentsOut = await Promise.all(
      docs.map(async (d) => ({
        ...d,
        ocrText: await decryptNullable(env, d.ocrText),
        downloadPath: `/api/document-file/${d.id}`,
      }))
    );
    const entitiesOut = await Promise.all(
      entities.map(async (e) => ({ ...e, data: JSON.parse(await decryptField(env, e.data)) }))
    );

    await logSecurityEvent(ctx.db, { type: "data_exported", userId: ctx.session.sub, orgId, req: ctx.req });

    return {
      exportedAt: new Date().toISOString(),
      format: "successio-export/v1",
      organization: org,
      users: members,
      documents: documentsOut,
      extractedEntities: entitiesOut,
      customers: cust,
      equipment: equip,
      employees: emps,
      financials: fin,
      processes: procs,
      milestones: miles,
      businessProfiles: profiles,
      shareTokens: tokens,
      shareViews: views,
      documentRequests: requests,
      readinessScores: scores,
    };
  }),

  // ── Account deletion ──────────────────────────────────────────────────────

  /** Permanent. Requires the password and typing the business name. Removes
   *  every row, file, and search vector — nothing is soft-deleted. */
  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string().min(1), confirmName: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await loadUser(ctx);
      if (user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the business owner can delete the account." });
      }
      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
      }
      const org = await ctx.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, user.orgId))
        .get();
      if (!org || org.name.trim().toLowerCase() !== input.confirmName.trim().toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Type your business name exactly as it appears to confirm." });
      }

      await logSecurityEvent(ctx.db, { type: "account_deletion_requested", userId: user.id, orgId: user.orgId, req: ctx.req });
      // Send the confirmation BEFORE purging — the address is gone afterwards.
      await sendAlert(
        ctx,
        user.email,
        user.name,
        "Your Successio account was deleted",
        `Every document, extracted record, profile, and share link for ${org.name} has been permanently removed from our systems. If you didn't request this, contact us right away.`
      );

      await purgeOrgs(ctx.env, [user.orgId]);

      if (ctx.session.jti && ctx.env.SESSIONS) await revokeSession(ctx.env.SESSIONS, ctx.session.jti);
      const { clearSessionCookie } = await import("@/lib/auth");
      ctx.resHeaders.append("Set-Cookie", clearSessionCookie());
      return { ok: true };
    }),
});
