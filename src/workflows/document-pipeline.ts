/**
 * Cloudflare Workflow: document-pipeline
 * Triggered by the Queue consumer (ingest.ts) once a file is confirmed in R2.
 *
 * Each step is idempotent: checks D1 status before executing.
 * Steps are retried automatically by the Workflow runtime on failure.
 * Never use setTimeout — the Workflow runtime handles scheduling.
 *
 * Per CLAUDE.md:
 *   Step 1: detect_file_type
 *   Step 2: ocr_if_needed
 *   Step 3: extract_entities → Claude Sonnet via AI Gateway
 *   Step 4: embed_chunks → Vectorize
 *   Step 5: update_readiness_score
 *   Step 6: flag_review_items
 */

import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { detectFileType } from "@/lib/r2";
import { runOcr } from "@/lib/ocr";
import { runExtraction } from "@/server/workers/extract";
import { runEmbedding } from "@/server/workers/embed";
import { recalculateScore } from "@/server/workers/score";
import type { DocumentJob } from "@/types";

interface PipelineEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  AI: Ai;
  VECTORS?: VectorizeIndex;
  PROCESSING_STATE?: DurableObjectNamespace;
  BROWSER?: unknown;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
}

export class DocumentPipeline extends WorkflowEntrypoint<PipelineEnv, DocumentJob> {
  async run(event: WorkflowEvent<DocumentJob>, step: WorkflowStep) {
    const { documentId, orgId, r2Key, mimeType, vertical } = event.payload;
    const env = this.env;
    const db = drizzle(env.DB, { schema });

    // ── Step 1: Detect file type (idempotent) ─────────────────────────────────
    const fileType = await step.do("detect_file_type", async () => {
      const detected = detectFileType(mimeType);
      await db.update(schema.documents)
        .set({ fileType: detected, status: "ocr" })
        .where(eq(schema.documents.id, documentId));
      return detected;
    });

    // ── Step 2: OCR / text extraction ─────────────────────────────────────────
    const ocrText = await step.do("ocr_document", async () => {
      // Fetch the file from R2
      const obj = await env.DOCUMENTS.get(r2Key);
      if (!obj) throw new Error(`R2 object not found: ${r2Key}`);

      // Audio → Whisper transcription (Workers AI native)
      if (fileType === "audio") {
        const { makeGateway } = await import("@/lib/ai-gateway");
        const gw = makeGateway(env);
        const bytes = await obj.arrayBuffer();
        const text = await gw.transcribeAudio(bytes);
        await db.update(schema.documents)
          .set({ ocrText: text, ocrConfidence: 0.95, status: "extracting" })
          .where(eq(schema.documents.id, documentId));
        return text;
      }

      const { makeGateway } = await import("@/lib/ai-gateway");
      const fileName = r2Key.split("/").pop() || r2Key;
      const result = await runOcr({ fileType, fileName, r2Object: obj, gateway: makeGateway(env), browser: env.BROWSER });

      await db.update(schema.documents)
        .set({ ocrText: result.text, ocrConfidence: result.confidence, status: "extracting" })
        .where(eq(schema.documents.id, documentId));

      return result.text;
    });

    // ── Step 3: Entity extraction (Claude Sonnet via AI Gateway) ──────────────
    await step.do("extract_entities", async () => {
      const org = await db.select({ name: schema.organizations.name })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .get();

      await runExtraction({
        documentId,
        orgId,
        vertical,
        ocrText,
        orgName: org?.name,
        env,
      });
    });

    // ── Step 4: Embed chunks into Vectorize ───────────────────────────────────
    await step.do("embed_chunks", async () => {
      await runEmbedding({ documentId, orgId, ocrText, env });
    });

    // ── Step 5: Recalculate readiness score ───────────────────────────────────
    await step.do("update_readiness_score", async () => {
      await recalculateScore({ orgId, vertical, env });
    });

    // ── Step 6: Flag items needing review ─────────────────────────────────────
    await step.do("flag_review_items", async () => {
      // Any entity for this document with needsReview=true triggers a document-level review flag.
      const flagged = await db.select({ id: schema.extractedEntities.id })
        .from(schema.extractedEntities)
        .where(
          and(
            eq(schema.extractedEntities.documentId, documentId),
            eq(schema.extractedEntities.needsReview, true)
          )
        )
        .all();

      await db.update(schema.documents)
        .set({ status: flagged.length > 0 ? "needs_review" : "complete" })
        .where(eq(schema.documents.id, documentId));
    });
  }
}
