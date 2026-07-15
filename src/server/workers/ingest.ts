/**
 * Cloudflare Queue consumer for document-jobs AND its dead-letter queue.
 *
 * document-jobs: receives a DocumentJob message, checks idempotency, and
 * triggers the Cloudflare Workflow for multi-step pipeline execution.
 *
 * document-jobs-dlq: jobs that exhausted their retries land here — each one
 * is marked failed in D1 so the vault can surface "processing failed — retry"
 * instead of leaving the document stuck on "queued" forever.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { documentJobSchema } from "@/types";
import { validateEnv } from "@/lib/env";
import { nanoid } from "@/lib/nanoid";
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

    // Dead-letter path: mark each stranded document failed and ack.
    if (batch.queue === "document-jobs-dlq") {
      for (const message of batch.messages) {
        try {
          const job = documentJobSchema.parse(message.body);
          await db
            .update(schema.documents)
            .set({
              status: "failed",
              errorMessage: "Processing failed after multiple attempts. Use Retry to try again.",
            })
            .where(eq(schema.documents.id, job.documentId));
          console.error(`[ingest:dlq] document ${job.documentId} marked failed`);
        } catch (err) {
          console.error("[ingest:dlq] could not mark document failed:", err);
        }
        message.ack(); // never bounce DLQ messages — this is the end of the line
      }
      return;
    }

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

        // Trigger Cloudflare Workflow (all 6 steps run there).
        // Instance ids are unique-forever, so a per-run suffix is required —
        // a bare documentId would make any retry/reprocess throw
        // "instance already exists" and permanently strand the document.
        if (env.DOCUMENT_WORKFLOW) {
          await env.DOCUMENT_WORKFLOW.create({
            id: `${job.documentId}-${nanoid(8)}`,
            params: job,
          });
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
