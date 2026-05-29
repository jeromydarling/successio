import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { users, organizations, associationInvites } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  signSession,
  makeSessionCookie,
  clearSessionCookie,
  revokeSession,
} from "@/lib/auth";
import { signupSchema, loginSchema } from "@/types";
import { nanoid } from "@/lib/nanoid";

export const authRouter = router({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input, ctx }) => {
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

      await ctx.db.insert(organizations).values({
        id: orgId,
        name: input.businessName,
        vertical: input.vertical,
        associationId,
      });

      await ctx.db.insert(users).values({
        id: userId,
        orgId,
        email: input.email.toLowerCase(),
        name: input.name,
        role: "owner",
        passwordHash,
      });

      if (inviteId) {
        await ctx.db
          .update(associationInvites)
          .set({ status: "claimed", claimedOrgId: orgId })
          .where(eq(associationInvites.id, inviteId));
      }

      const token = await signSession(
        { sub: userId, orgId, email: input.email.toLowerCase(), role: "owner" },
        ctx.env.JWT_SECRET
      );
      const isSecure = ctx.env.ENVIRONMENT === "production";
      const cookie = makeSessionCookie(token, isSecure);

      return { userId, orgId, cookie };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
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

      return { userId: user.id, orgId: user.orgId, cookie };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Revoke the current token id so the JWT can't be replayed before expiry.
    if (ctx.session?.jti && ctx.env.SESSIONS) {
      await revokeSession(ctx.env.SESSIONS, ctx.session.jti);
    }
    return { cookie: clearSessionCookie() };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        orgId: users.orgId,
      })
      .from(users)
      .where(eq(users.id, ctx.session.sub))
      .get();

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return user;
  }),
});
