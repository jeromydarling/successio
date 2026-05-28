import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { documents, organizations } from "@/db/schema";
import { documentKey, detectFileType } from "@/lib/r2";
import { uploadRequestSchema, documentJobSchema } from "@/types";

function nanoid(len = 21) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

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

      // Generate presigned PUT URL (1 hour)
      const uploadUrl = await (ctx.env.DOCUMENTS as any).createPresignedUrl?.(
        "PUT",
        r2Key,
        { expiresIn: 3600 }
      ) ?? `https://r2-upload-placeholder.invalid/${r2Key}`;

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
        const job = documentJobSchema.parse({
          documentId: doc.id,
          orgId,
          r2Key: doc.r2Key,
          mimeType: doc.mimeType,
          vertical: "manufacturing", // TODO: load from org record
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
});
