import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  verifySession,
  getTokenFromCookie,
  isSessionRevoked,
  getUserSessionCutoff,
} from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";
import { timingSafeEqual } from "@/lib/timing-safe-equal";

export interface Context {
  db: DrizzleD1Database<typeof schema>;
  env: {
    DB: D1Database;
    DOCUMENTS: R2Bucket;
    AI: Ai;
    JWT_SECRET: string;
    CF_ACCOUNT_ID?: string;
    CF_AI_GATEWAY_ID: string;
    DOCUMENT_QUEUE?: Queue;
    VECTORS?: VectorizeIndex;
    PROCESSING_STATE?: DurableObjectNamespace;
    SESSIONS?: KVNamespace;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
    ENVIRONMENT: string;
    // Cloud-connector public client IDs/keys (picker flows — not secrets).
    DROPBOX_APP_KEY?: string;
    GOOGLE_PICKER_API_KEY?: string;
    GOOGLE_OAUTH_CLIENT_ID?: string;
    MS_CLIENT_ID?: string;
    MS_TENANT_ID?: string;
    // Cloudflare Email Sending: native binding (preferred) + REST fallback.
    EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
    CF_API_TOKEN?: string;
    EMAIL_FROM?: string;
    APP_URL?: string;
    // E2E rig: when not "on", signup auto-verifies and skips the email step.
    EMAIL_VERIFICATION?: string;
    // Token guarding the test-user purge endpoint (has a known CI fallback).
    E2E_ADMIN_TOKEN?: string;
    // Token protecting the /superadmin CRM area.
    SUPER_ADMIN_TOKEN?: string;
  };
  session: SessionPayload | null;
  req: Request;
  /** Response headers merged into the HTTP response — used to set Set-Cookie. */
  resHeaders: Headers;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Throws 401 if no valid session cookie is present.
 *  Demo sessions are browse-only: every mutation is blocked so a demo visitor
 *  can never alter data, send email, or burn AI compute. */
export const protectedProcedure = t.procedure.use(async ({ ctx, type, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  if (ctx.session.demo && type === "mutation") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The demo is read-only — sign up for a free account to make changes.",
    });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/** Throws 401 unless a valid sa_token cookie matches SUPER_ADMIN_TOKEN. */
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const cookie = ctx.req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .find((c) => c.trim().startsWith("sa_token="))
    ?.split("=")[1]
    ?.trim();
  const expected = ctx.env.SUPER_ADMIN_TOKEN;
  if (!expected || !token || !timingSafeEqual(token, expected)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Super admin access required" });
  }
  return next({ ctx });
});

/** Creates a Context from a raw Request + bound env. */
export async function createContext(
  req: Request,
  env: Context["env"],
  resHeaders: Headers = new Headers()
): Promise<Context> {
  const { drizzle } = await import("drizzle-orm/d1");
  const db = drizzle(env.DB, { schema: await import("@/db/schema") });

  const cookie = req.headers.get("cookie");
  const token = getTokenFromCookie(cookie);
  let session = token ? await verifySession(token, env.JWT_SECRET) : null;

  // Honour KV revocation list (logout / forced sign-out) when available.
  if (session?.jti && env.SESSIONS) {
    if (await isSessionRevoked(env.SESSIONS, session.jti)) {
      session = null;
    }
  }

  // Honour the per-user issued-at cutoff (set on password reset): any token
  // issued before the cutoff is dead, so old sessions can't outlive a reset.
  if (session?.iat && env.SESSIONS) {
    const cutoff = await getUserSessionCutoff(env.SESSIONS, session.sub);
    if (cutoff !== null && session.iat < cutoff) {
      session = null;
    }
  }

  return {
    db: db as DrizzleD1Database<typeof schema>,
    env,
    session,
    req,
    resHeaders,
  };
}
