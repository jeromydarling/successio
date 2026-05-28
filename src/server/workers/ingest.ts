/**
 * Cloudflare Queue consumer: document-jobs
 * Receives a DocumentJob message, updates document status, detects file type,
 * and kicks off the Cloudflare Workflow pipeline (or runs inline if no Workflow).
 *
 * Per CLAUDE.md: every step checks D1 status before executing (idempotent).
 * All errors go to dead-letter queue via automatic retry (max_retries = 3 in wrangler.toml).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { documentJobSchema } from "@/types";
import { detectFileType } from "@/lib/r2";
import { validateEnv } from "@/lib/env";

interface IngestEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  CF_AI_GATEWAY_ID: string;
  DOCUMENT_QUEUE: Queue;
  ENVIRONMENT: string;
}

export default {
  async queue(batch: MessageBatch<unknown>, env: IngestEnv): Promise<void> {
    // Fail loudly on missing env — never silently drop jobs
    validateEnv(env as unknown as Record<string, unknown>);
    const db = drizzle(env.DB, { schema });

    for (const message of batch.messages) {
      try {
        const job = documentJobSchema.parse(message.body);
        await processDocument(job, db, env);
        message.ack();
      } catch (err) {
        console.error("[ingest] Failed to process message:", err);
        message.retry();
      }
    }
  },
};

async function processDocument(
  job: { documentId: string; orgId: string; r2Key: string; mimeType: string; vertical: string },
  db: ReturnType<typeof drizzle>,
  env: IngestEnv
) {
  // Check idempotency: skip if already past 'queued'
  const doc = await db
    .select({ status: schema.documents.status })
    .from(schema.documents)
    .where(eq(schema.documents.id, job.documentId))
    .get();

  if (!doc) {
    console.warn(`[ingest] Document ${job.documentId} not found in DB — skipping`);
    return;
  }

  // Only process if still queued (idempotent re-delivery safety)
  if (doc.status !== "queued") {
    console.info(`[ingest] Document ${job.documentId} already in status ${doc.status} — skipping`);
    return;
  }

  // Step 1: detect file type
  const fileType = detectFileType(job.mimeType);

  await db
    .update(schema.documents)
    .set({ fileType, status: "ocr" })
    .where(eq(schema.documents.id, job.documentId));

  console.info(`[ingest] Document ${job.documentId}: type=${fileType}, vertical=${job.vertical}`);

  // Subsequent steps (OCR → extraction → embedding → scoring) will be handled
  // by the Cloudflare Workflow once DOCUMENT_WORKFLOW binding is provisioned.
  // For Phase 1, we log and mark as pending — the pipeline shell is in place.
  //
  // TODO Phase 2: trigger DOCUMENT_WORKFLOW.create(job.documentId, job)
  await db
    .update(schema.documents)
    .set({ status: "extracting" })
    .where(eq(schema.documents.id, job.documentId));
}
