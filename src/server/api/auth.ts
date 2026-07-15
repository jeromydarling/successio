import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, type Context } from "../trpc";
import { users, organizations, associationInvites, authTokens, sessions } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  signSession,
  makeSessionCookie,
  clearSessionCookie,
  revokeSession,
  revokeAllUserSessions,
} from "@/lib/auth";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";
import { signupSchema, loginSchema } from "@/types";
import { nanoid } from "@/lib/nanoid";
import { getEmailSender } from "@/lib/email/sender";
import { passwordResetEmail, verifyEmail } from "@/lib/email/templates";
import { generateRawToken, hashToken, expiryFor, type TokenKind } from "@/lib/email/tokens";

/** Base URL for links in emails. */
function appUrl(env: { APP_URL?: string }): string {
  return env.APP_URL || "https://successio.pro";
}

/** Best-effort KV rate limit keyed on hashed IP (+ optional identifier).
 *  Throws TOO_MANY_REQUESTS when the fixed window is exhausted. */
async function guardRate(
  ctx: Context,
  bucket: string,
  id: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  if (!ctx.env.SESSIONS) return; // no KV bound (local dev) — skip
  const ip = ctx.req.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `${bucket}:${await sha256Hex(`${ip}:${id}`)}`;
  const { allowed } = await rateLimit(ctx.env.SESSIONS, key, limit, windowSeconds);
  if (!allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts — please wait a few minutes and try again.",
    });
  }
}

/** Record a login event. Powers "last login" in the CRM and the churn cron's
 *  inactivity signal. Best-effort — a failed insert never blocks sign-in. */
async function recordLogin(ctx: Context, userId: string): Promise<void> {
  try {
    await ctx.db.insert(sessions).values({
      id: nanoid(),
      userId,
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
    });
  } catch (err) {
    console.error("[auth] failed to record login:", err);
  }
}

/** Issue a single-use token for a user+kind, returning the raw token. */
async function issueToken(
  db: import("drizzle-orm/d1").DrizzleD1Database<typeof import("@/db/schema")>,
  userId: string,
  kind: TokenKind
): Promise<string> {
  const raw = generateRawToken();
  await db.insert(authTokens).values({
    id: nanoid(),
    userId,
    kind,
    tokenHash: await hashToken(raw),
    expiresAt: expiryFor(kind),
  });
  return raw;
}

export const authRouter = router({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input, ctx }) => {
      await guardRate(ctx, "signup", "", 10, 3600); // 10 signups/hour per IP

      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .get();

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const orgId = nanoid();
      const userId = nanoid();
      const passwordHash = await hashPassword(input.password);

      // If joining via an association invite, link the new business to it.
      let associationId: string | undefined;
      let inviteId: string | undefined;
      if (input.inviteToken) {
        const invite = await ctx.db
          .select({ id: associationInvites.id, associationId: associationInvites.associationId, status: associationInvites.status })
          .from(associationInvites)
          .where(eq(associationInvites.token, input.inviteToken))
          .get();
        if (invite && invite.status === "pending") {
          associationId = invite.associationId;
          inviteId = invite.id;
        }
      }

      // Email verification is opt-in via the EMAIL_VERIFICATION flag. When it's
      // not "on" (the default), the account is created already-verified and the
      // confirm step is skipped, so a new user can use the whole app at once.
      // Re-enable verification by setting EMAIL_VERIFICATION="on" (one var).
      const verificationOn = ctx.env.EMAIL_VERIFICATION === "on";

      // Atomic: org + user (+ invite claim) land together or not at all, so a
      // duplicate-email race can never leave an orphaned organization row.
      const orgInsert = ctx.db.insert(organizations).values({
        id: orgId,
        name: input.businessName,
        vertical: input.vertical,
        associationId,
      });
      const userInsert = ctx.db.insert(users).values({
        id: userId,
        orgId,
        email: input.email.toLowerCase(),
        name: input.name,
        role: "owner",
        passwordHash,
        emailVerifiedAt: verificationOn ? null : new Date(),
      });
      if (inviteId) {
        await ctx.db.batch([
          orgInsert,
          userInsert,
          ctx.db
            .update(associationInvites)
            .set({ status: "claimed", claimedOrgId: orgId })
            .where(eq(associationInvites.id, inviteId)),
        ]);
      } else {
        await ctx.db.batch([orgInsert, userInsert]);
      }

      const token = await signSession(
        { sub: userId, orgId, email: input.email.toLowerCase(), role: "owner" },
        ctx.env.JWT_SECRET
      );
      const isSecure = ctx.env.ENVIRONMENT === "production";
      const cookie = makeSessionCookie(token, isSecure);
      ctx.resHeaders.append("Set-Cookie", cookie);
      await recordLogin(ctx, userId);

      // Send an email-verification link (best-effort — don't block signup).
      // Skipped entirely when verification is off, since the user is already
      // verified above and the journey must never depend on an email link.
      if (verificationOn) {
        try {
          const raw = await issueToken(ctx.db, userId, "email_verify");
          const url = `${appUrl(ctx.env)}/verify-email?token=${raw}`;
          const mail = verifyEmail({ name: input.name, url });
          await getEmailSender(ctx.env).send({ to: input.email.toLowerCase(), ...mail });
        } catch (err) {
          console.error("[auth] signup verification email failed:", err);
        }
      }

      return { userId, orgId, cookie };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      // 10 attempts per 5 minutes per IP+email — blunts credential stuffing.
      await guardRate(ctx, "login", input.email.toLowerCase(), 10, 300);

      const user = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .get();

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const token = await signSession(
        { sub: user.id, orgId: user.orgId, email: user.email, role: user.role },
        ctx.env.JWT_SECRET
      );
      const isSecure = ctx.env.ENVIRONMENT === "production";
      const cookie = makeSessionCookie(token, isSecure);
      ctx.resHeaders.append("Set-Cookie", cookie);
      await recordLogin(ctx, user.id);

      return { userId: user.id, orgId: user.orgId, cookie };
    }),

  /**
   * One-click demo sign-in. No password — mints a session for one of two
   * pre-seeded read-only demo personas so visitors can explore the real app.
   * Restricted to a hardcoded allowlist of demo accounts.
   */
  demoLogin: publicProcedure
    .input(z.object({ persona: z.enum(["owner", "association"]) }))
    .mutation(async ({ input, ctx }) => {
      const DEMO = {
        owner: { email: "owner1@heartland-demo.org", redirect: "/dashboard" },
        association: { email: "director@heartland-demo.org", redirect: "/admin" },
      } as const;
      const target = DEMO[input.persona];

      const user = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, target.email))
        .get();
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Demo is not available right now." });
      }

      // demo: true → every mutation is rejected by protectedProcedure, so the
      // demo personas are enforced read-only server-side, not by convention.
      const token = await signSession(
        { sub: user.id, orgId: user.orgId, email: user.email, role: user.role, demo: true },
        ctx.env.JWT_SECRET
      );
      const isSecure = ctx.env.ENVIRONMENT === "production";
      const cookie = makeSessionCookie(token, isSecure);
      ctx.resHeaders.append("Set-Cookie", cookie);

      return { cookie, redirect: target.redirect };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Revoke the current token id so the JWT can't be replayed before expiry.
    if (ctx.session?.jti && ctx.env.SESSIONS) {
      await revokeSession(ctx.env.SESSIONS, ctx.session.jti);
    }
    const cookie = clearSessionCookie();
    ctx.resHeaders.append("Set-Cookie", cookie);
    return { cookie };
  }),

  /** Request a password-reset link. Always returns ok (no account enumeration). */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      // 3 requests per 15 minutes per IP+email — stops reset-email bombing.
      await guardRate(ctx, "pwreset", input.email.toLowerCase(), 3, 900);

      const user = await ctx.db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .get();

      if (user) {
        const raw = await issueToken(ctx.db, user.id, "password_reset");
        const url = `${appUrl(ctx.env)}/reset-password?token=${raw}`;
        const mail = passwordResetEmail({ name: user.name, url });
        try {
          await getEmailSender(ctx.env).send({ to: user.email, ...mail });
        } catch (err) {
          console.error("[auth] password reset email failed:", err);
        }
      }
      return { ok: true };
    }),

  /** Complete a password reset with a valid, unused, unexpired token. */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(10), password: z.string().min(8).max(200) }))
    .mutation(async ({ input, ctx }) => {
      const tokenHash = await hashToken(input.token);
      const row = await ctx.db
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.kind, "password_reset")))
        .get();

      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
      }

      await ctx.db
        .update(users)
        .set({ passwordHash: await hashPassword(input.password) })
        .where(eq(users.id, row.userId));
      await ctx.db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));

      // Revoke any outstanding reset tokens for this user.
      await ctx.db
        .update(authTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(authTokens.userId, row.userId), eq(authTokens.kind, "password_reset")));

      // Kill every session issued before this moment — a hijacker's stolen
      // 30-day JWT must not survive the owner resetting their password.
      if (ctx.env.SESSIONS) {
        await revokeAllUserSessions(ctx.env.SESSIONS, row.userId);
      }

      return { ok: true };
    }),

  /** Send (or resend) an email-verification link to the signed-in user. */
  sendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db
      .select({ id: users.id, name: users.name, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, ctx.session.sub))
      .get();
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

    const raw = await issueToken(ctx.db, user.id, "email_verify");
    const url = `${appUrl(ctx.env)}/verify-email?token=${raw}`;
    const mail = verifyEmail({ name: user.name, url });
    try {
      await getEmailSender(ctx.env).send({ to: user.email, ...mail });
    } catch (err) {
      console.error("[auth] verification email failed:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't send the email — try again shortly." });
    }
    return { ok: true };
  }),

  /** Confirm an email address from a verification token. */
  verifyEmailToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      const tokenHash = await hashToken(input.token);
      const row = await ctx.db
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.kind, "email_verify")))
        .get();

      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This confirmation link is invalid or has expired." });
      }

      await ctx.db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
      await ctx.db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
      return { ok: true };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        orgId: users.orgId,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, ctx.session.sub))
      .get();

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return { ...user, emailVerified: !!user.emailVerifiedAt };
  }),
});
