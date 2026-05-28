/**
 * Cloudflare Queue consumer: document-jobs
 * Receives a DocumentJob message, updates document status, and triggers
 * the Cloudflare Workflow for multi-step pipeline execution.
 *
 * Idempotent: skips documents not in 'queued' status.
 * Failures retry via the Queue's DLQ (max_retries = 3 in wrangler.toml).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { documentJobSchema } from "@/types";
import { validateEnv } from "@/lib/env";
import type { DocumentPipeline } from "@/workflows/document-pipeline";

interface IngestEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  CF_AI_GATEWAY_ID: string;
  DOCUMENT_QUEUE: Queue;
  DOCUMENT_WORKFLOW?: Workflow;
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
}

export default {
  async queue(batch: MessageBatch<unknown>, env: IngestEnv): Promise<void> {
    validateEnv(env as unknown as Record<string, unknown>);
    const db = drizzle(env.DB, { schema });

    for (const message of batch.messages) {
      try {
        const job = documentJobSchema.parse(message.body);

        // Idempotency check
        const doc = await db
          .select({ status: schema.documents.status })
          .from(schema.documents)
          .where(eq(schema.documents.id, job.documentId))
          .get();

        if (!doc) {
          console.warn(`[ingest] Document ${job.documentId} not in DB — skipping`);
          message.ack();
          continue;
        }

        if (doc.status !== "queued") {
          console.info(`[ingest] Document ${job.documentId} already ${doc.status} — skipping`);
          message.ack();
          continue;
        }

        // Trigger Cloudflare Workflow (all 6 steps run there)
        if (env.DOCUMENT_WORKFLOW) {
          await env.DOCUMENT_WORKFLOW.create({ id: job.documentId, params: job });
          console.info(`[ingest] Workflow triggered for document ${job.documentId}`);
        } else {
          // Fallback for local dev without Workflow binding
          console.warn(`[ingest] No DOCUMENT_WORKFLOW binding — document ${job.documentId} queued but not processed`);
          await db.update(schema.documents)
            .set({ status: "extracting" })
            .where(eq(schema.documents.id, job.documentId));
        }

        message.ack();
      } catch (err) {
        console.error("[ingest] Failed to process message:", err);
        message.retry();
      }
    }
  },
};
