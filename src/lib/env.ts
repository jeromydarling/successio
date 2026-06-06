import { z } from "zod";

/**
 * Validates all required env vars at startup.
 * Called at the top of every Worker entry point — fails loudly if missing.
 */
const envSchema = z.object({
  // Cloudflare bindings — injected by the runtime, never missing in prod
  DB: z.any(),           // D1Database
  DOCUMENTS: z.any(),    // R2Bucket
  AI: z.any(),           // Ai
  DOCUMENT_QUEUE: z.any().optional(),
  VECTORS: z.any().optional(),
  PROCESSING_STATE: z.any().optional(),
  DEAL_ROOM: z.any().optional(),
  DOCUMENT_WORKFLOW: z.any().optional(),
  SESSIONS: z.any().optional(), // KV: session revocation + rate limiting

  // Secrets — must be set via wrangler secret put
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 chars").optional(),

  // R2 S3-API credentials for presigned upload/download URLs
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("successio-documents"),

  // AI provider keys (routed through AI Gateway — never called directly)
  ANTHROPIC_API_KEY: z.string().startsWith("sk-").optional(),
  MISTRAL_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Cloudflare account config
  CF_ACCOUNT_ID: z.string().optional(),
  CF_AI_GATEWAY_ID: z.string().default("successio-prod"),

  ENVIRONMENT: z.enum(["development", "production", "test"]).default("production"),

  // E2E test rig. EMAIL_VERIFICATION: when not "on", signup creates already-
  // verified users and skips the confirm email (so a new account can use the
  // whole app immediately). Re-enable real verification by setting it to "on".
  EMAIL_VERIFICATION: z.string().optional(),
  // Token guarding POST /api/admin/purge-user (test-account cleanup).
  E2E_ADMIN_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("\n  ");
    throw new Error(`[successio] Missing or invalid env vars:\n  ${missing}`);
  }
  return result.data;
}
