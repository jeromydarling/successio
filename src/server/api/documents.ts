import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { documents, organizations, extractedEntities } from "@/db/schema";
import { documentKey, detectFileType } from "@/lib/r2";
import { presignR2Url, r2CredentialsFromEnv } from "@/lib/r2-presign";
import { uploadRequestSchema, documentJobSchema } from "@/types";
import type { Vertical } from "@/lib/verticals";
import { nanoid } from "@/lib/nanoid";

export const documentsRouter = router({
  /** Step 1: Client calls this → gets a presigned R2 PUT URL + documentId.
   *  Step 2: Client PUTs file directly to R2.
   *  Step 3: Client calls confirmUpload with the documentId. */
  requestUpload: protectedProcedure
    .input(uploadRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;
      const documentId = nanoid();
      const r2Key = documentKey(orgId, documentId, input.filename);

      // Insert the document record immediately so confirmUpload can find it
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

      // Generate a real presigned PUT URL (1 hour) via R2's S3 API.
      const uploadUrl = await presignR2Url(
        r2CredentialsFromEnv(ctx.env),
        "PUT",
        r2Key,
        3600
      );

      return { documentId, uploadUrl, r2Key };
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
        .where(eq(documents.orgId, orgId))
        .orderBy(desc(documents.createdAt))
        .limit(input.limit);

      return rows;
    }),

  get: protectedProcedure
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
      return doc;
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

      // Query Vectorize — filter by orgId via metadata
      const results = await ctx.env.VECTORS.query(queryVector, {
        topK: 10,
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
});
