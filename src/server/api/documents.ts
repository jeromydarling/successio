import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { documents, organizations, extractedEntities } from "@/db/schema";
import { documentKey, detectFileType } from "@/lib/r2";
import { uploadRequestSchema, documentJobSchema } from "@/types";
import type { Vertical } from "@/lib/verticals";
import { nanoid } from "@/lib/nanoid";

export const documentsRouter = router({
  /** Step 1: Client calls this → creates the document row, returns documentId.
   *  Step 2: Client POSTs the file bytes to /api/upload?documentId=… (the Worker
   *          writes them to R2 via the binding — no S3 credentials needed).
   *  Step 3: Client calls confirmUpload with the documentId. */
  requestUpload: protectedProcedure
    .input(uploadRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;
      const documentId = nanoid();
      const r2Key = documentKey(orgId, documentId, input.filename);

      // Insert the document record immediately so the upload + confirm can find it
      await ctx.db.insert(documents).values({
        id: documentId,
        orgId,
        uploadedBy: ctx.session.sub,
        r2Key,
        originalName: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        status: "queued",
      });

      return { documentId, r2Key };
    }),

  /** Called after the client has successfully PUT to R2.
   *  Updates status and enqueues the processing job. */
  confirmUpload: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      const doc = await ctx.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.orgId, orgId)
          )
        )
        .get();

      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      const fileType = detectFileType(doc.mimeType);

      await ctx.db
        .update(documents)
        .set({ fileType, status: "queued" })
        .where(eq(documents.id, input.documentId));

      // Enqueue the processing job
      if (ctx.env.DOCUMENT_QUEUE) {
        // Load org vertical so the pipeline uses the correct extraction prompt
        const org = await ctx.db
          .select({ vertical: organizations.vertical })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .get();

        const job = documentJobSchema.parse({
          documentId: doc.id,
          orgId,
          r2Key: doc.r2Key,
          mimeType: doc.mimeType,
          vertical: (org?.vertical ?? "manufacturing") as Vertical,
        });
        await ctx.env.DOCUMENT_QUEUE.send(job);
      }

      return { documentId: doc.id, fileType, status: "queued" as const };
    }),

  /** Requeue a document whose processing failed (or has been stuck in an
   *  in-flight status long enough that the pipeline clearly died). */
  retry: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      const doc = await ctx.db
        .select()
        .from(documents)
        .where(and(eq(documents.id, input.documentId), eq(documents.orgId, orgId)))
        .get();

      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      const STUCK_AFTER_MS = 15 * 60 * 1000;
      const inFlight = ["queued", "ocr", "extracting", "embedding"].includes(doc.status);
      const stuck =
        inFlight && doc.createdAt && Date.now() - doc.createdAt.getTime() > STUCK_AFTER_MS;

      if (doc.status !== "failed" && !stuck) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This document is still processing — retry is only available once it fails or stalls.",
        });
      }

      await ctx.db
        .update(documents)
        .set({ status: "queued", errorMessage: null })
        .where(eq(documents.id, input.documentId));

      if (ctx.env.DOCUMENT_QUEUE) {
        const org = await ctx.db
          .select({ vertical: organizations.vertical })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .get();

        const job = documentJobSchema.parse({
          documentId: doc.id,
          orgId,
          r2Key: doc.r2Key,
          mimeType: doc.mimeType,
          vertical: (org?.vertical ?? "manufacturing") as Vertical,
        });
        await ctx.env.DOCUMENT_QUEUE.send(job);
      }

      return { documentId: doc.id, status: "queued" as const };
    }),

  /** Paginated document list. `cursor` is `${createdAtEpoch}_${id}` of the
   *  last row of the previous page; `status` filters server-side. Returns
   *  { items, nextCursor } — nextCursor is undefined on the final page. */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
        status: z
          .enum(["queued", "ocr", "extracting", "embedding", "complete", "failed", "needs_review"])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      const conditions = [eq(documents.orgId, orgId)];
      if (input.status) conditions.push(eq(documents.status, input.status));
      if (input.cursor) {
        const [tsRaw, id] = input.cursor.split("_");
        const ts = parseInt(tsRaw, 10);
        if (Number.isFinite(ts) && id) {
          conditions.push(
            sql`(${documents.createdAt} < ${ts} OR (${documents.createdAt} = ${ts} AND ${documents.id} < ${id}))`
          );
        }
      }

      // Fetch one extra row to know whether another page exists.
      const rows = await ctx.db
        .select({
          id: documents.id,
          originalName: documents.originalName,
          mimeType: documents.mimeType,
          sizeBytes: documents.sizeBytes,
          fileType: documents.fileType,
          documentType: documents.documentType,
          status: documents.status,
          ocrConfidence: documents.ocrConfidence,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt), desc(documents.id))
        .limit(input.limit + 1)
        .all();

      let nextCursor: string | undefined;
      if (rows.length > input.limit) {
        rows.length = input.limit;
        const last = rows[rows.length - 1];
        nextCursor = `${Math.floor(last.createdAt.getTime() / 1000)}_${last.id}`;
      }

      return { items: rows, nextCursor };
    }),

  /** Semantic search via Vectorize. Falls back to empty results if VECTORS not bound. */
  semanticSearch: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .query(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      if (!ctx.env.VECTORS) {
        return [];
      }

      // Embed the query using Workers AI
      const embedResult = await (ctx.env.AI as any).run("@cf/baai/bge-base-en-v1.5", {
        text: [input.query],
      }) as { data: number[][] };

      const queryVector = embedResult.data[0];
      if (!queryVector) return [];

      // Query Vectorize within this org's namespace (hard isolation),
      // with the metadata filter as defense-in-depth.
      const results = await ctx.env.VECTORS.query(queryVector, {
        topK: 10,
        namespace: `org_${orgId}`,
        filter: { orgId },
        returnMetadata: "all",
      });

      if (!results.matches || results.matches.length === 0) return [];

      // Extract unique document IDs from vector metadata
      const docIds = [...new Set(
        results.matches
          .map((m: any) => m.metadata?.documentId as string | undefined)
          .filter(Boolean)
      )] as string[];

      if (docIds.length === 0) return [];

      // Fetch document records
      const docs = await ctx.db
        .select({
          id: documents.id,
          originalName: documents.originalName,
          mimeType: documents.mimeType,
          fileType: documents.fileType,
          documentType: documents.documentType,
          status: documents.status,
          ocrConfidence: documents.ocrConfidence,
          sizeBytes: documents.sizeBytes,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(and(
          eq(documents.orgId, orgId),
          inArray(documents.id, docIds)
        ))
        .all();

      // Attach relevance scores
      const scoreMap = new Map(
        results.matches.map((m: any) => [m.metadata?.documentId as string, m.score as number])
      );

      return docs
        .map((d) => ({ ...d, relevanceScore: scoreMap.get(d.id) ?? 0 }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }),

  /** Returns full document + extracted entities for the vault slide-over. */
  getDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const doc = await ctx.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.id),
            eq(documents.orgId, ctx.session.orgId)
          )
        )
        .get();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      const entities = await ctx.db
        .select({
          id: extractedEntities.id,
          entityType: extractedEntities.entityType,
          data: extractedEntities.data,
          confidence: extractedEntities.confidence,
          needsReview: extractedEntities.needsReview,
        })
        .from(extractedEntities)
        .where(eq(extractedEntities.documentId, input.id))
        .all();

      return { doc, entities };
    }),

  /** Owner confirms the low-confidence extractions for a document are correct
   *  (after checking — and fixing anything wrong on the Business Data page).
   *  Stamps reviewedAt on its entities and completes the document. */
  markReviewed: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      const doc = await ctx.db
        .select({ id: documents.id, status: documents.status })
        .from(documents)
        .where(and(eq(documents.id, input.documentId), eq(documents.orgId, orgId)))
        .get();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (doc.status !== "needs_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This document isn't awaiting review." });
      }

      await ctx.db
        .update(extractedEntities)
        .set({ needsReview: false, reviewedAt: new Date() })
        .where(
          and(
            eq(extractedEntities.documentId, input.documentId),
            eq(extractedEntities.orgId, orgId)
          )
        );
      await ctx.db
        .update(documents)
        .set({ status: "complete" })
        .where(eq(documents.id, input.documentId));

      return { documentId: input.documentId, status: "complete" as const };
    }),
});
