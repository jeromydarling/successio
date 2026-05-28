import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifySession, getTokenFromCookie } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@/db/schema";

export interface Context {
  db: DrizzleD1Database<typeof schema>;
  env: {
    DOCUMENTS: R2Bucket;
    AI: Ai;
    JWT_SECRET: string;
    CF_ACCOUNT_ID?: string;
    CF_AI_GATEWAY_ID: string;
    DOCUMENT_QUEUE?: Queue;
    VECTORS?: VectorizeIndex;
    PROCESSING_STATE?: DurableObjectNamespace;
    ENVIRONMENT: string;
  };
  session: SessionPayload | null;
  req: Request;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Throws 401 if no valid session cookie is present. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/** Creates a Context from a raw Request + bound env. */
export async function createContext(
  req: Request,
  env: Context["env"] & { DB: D1Database; JWT_SECRET: string }
): Promise<Context> {
  const { drizzle } = await import("drizzle-orm/d1");
  const db = drizzle(env.DB, { schema: await import("@/db/schema") });

  const cookie = req.headers.get("cookie");
  const token = getTokenFromCookie(cookie);
  const session = token ? await verifySession(token, env.JWT_SECRET) : null;

  return {
    db: db as DrizzleD1Database<typeof schema>,
    env,
    session,
    req,
  };
}
