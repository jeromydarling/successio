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
import { eq, and, inArray, count } from "drizzle-orm";
import * as schema from "@/db/schema";
import { detectFileType } from "@/lib/r2";
import { runOcr } from "@/lib/ocr";
import { runExtraction } from "@/server/workers/extract";
import { runEmbedding } from "@/server/workers/embed";
import { recalculateScore } from "@/server/workers/score";
import { getEmailSender } from "@/lib/email/sender";
import { processingCompleteEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";
import type { DocumentJob } from "@/types";

/** Document statuses that mean "still being worked on" (vs. a terminal state). */
const IN_FLIGHT_STATUSES = ["queued", "ocr", "extracting", "embedding"] as const;

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
  CF_AIG_TOKEN?: string;
  // Email Sending — same bindings/vars declared in wrangler.toml.
  EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
  CF_API_TOKEN?: string;
  EMAIL_FROM?: string;
  APP_URL?: string;
}

export class DocumentPipeline extends WorkflowEntrypoint<PipelineEnv, DocumentJob> {
  async run(event: WorkflowEvent<DocumentJob>, step: WorkflowStep) {
    // If any step exhausts its retries, the whole run fails — without this
    // handler the document would be stranded in an in-flight status forever.
    // Mark it failed so the vault can offer a retry, then rethrow so the
    // workflow run itself is recorded as errored.
    try {
      await this.pipeline(event, step);
    } catch (err) {
      const db = drizzle(this.env.DB, { schema });
      const msg = err instanceof Error ? err.message : "Processing failed";
      await db
        .update(schema.documents)
        .set({ status: "failed", errorMessage: msg.slice(0, 500) })
        .where(eq(schema.documents.id, event.payload.documentId));
      throw err;
    }
  }

  private async pipeline(event: WorkflowEvent<DocumentJob>, step: WorkflowStep) {
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

    // No readable text → stop here. Running extraction on an empty string
    // wastes AI calls at best and invents entities at worst; the vault shows
    // the document as needing the owner's eyes instead.
    if (!ocrText || ocrText.trim().length === 0) {
      await step.do("flag_unreadable", async () => {
        await db
          .update(schema.documents)
          .set({
            status: "needs_review",
            errorMessage:
              "We couldn't read any text from this file. Try a clearer photo or a different export.",
          })
          .where(eq(schema.documents.id, documentId));
      });
      return;
    }

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
    const { score } = await step.do("update_readiness_score", async () => {
      return recalculateScore({ orgId, vertical, env });
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

    // ── Step 7: Notify the owner when the upload batch finishes ────────────────
    // Each document is its own workflow, so emailing per-document would spam a
    // bulk upload. Instead we only notify once nothing else for this org is
    // still in flight — so a 20-file upload yields a single summary email.
    await step.do("notify_owner", async () => {
      const stillProcessing = await db
        .select({ id: schema.documents.id })
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.orgId, orgId),
            inArray(schema.documents.status, [...IN_FLIGHT_STATUSES])
          )
        )
        .all();
      if (stillProcessing.length > 0) return { sent: false, reason: "batch in flight" };

      const owner = await db
        .select({ name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, "owner")))
        .get();
      if (!owner) return { sent: false, reason: "no owner" };

      const org = await db
        .select({ name: schema.organizations.name })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .get();

      const processed = await db
        .select({ n: count() })
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.orgId, orgId),
            inArray(schema.documents.status, ["complete", "needs_review"])
          )
        )
        .get();

      const base = appUrl(env);
      const mail = processingCompleteEmail({
        name: owner.name,
        orgName: org?.name ?? "your business",
        documentCount: processed?.n ?? 1,
        score,
        url: `${base}/dashboard`,
      });
      try {
        await getEmailSender(env).send({ to: owner.email, ...mail });
        return { sent: true };
      } catch (err) {
        // Never fail the pipeline over a notification.
        console.error("[pipeline] completion email failed:", err);
        return { sent: false, reason: "send error" };
      }
    });
  }
}
