/**
 * Shared document ingest: store bytes in R2, create the document row, and
 * enqueue the processing job — the same pipeline manual uploads use. Reused by
 * the cloud-connector import route so imported files flow through OCR →
 * extraction → embeddings → readiness exactly like uploaded ones.
 */

import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { documents, organizations } from "@/db/schema";
import { documentKey, detectFileType } from "@/lib/r2";
import { documentJobSchema } from "@/types";
import type { Vertical } from "@/lib/verticals";
import { nanoid } from "@/lib/nanoid";

export interface IngestInput {
  orgId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

export async function ingestDocument(
  env: { DOCUMENTS: R2Bucket; DOCUMENT_QUEUE?: Queue },
  db: DrizzleD1Database<typeof schema>,
  input: IngestInput
): Promise<{ documentId: string }> {
  const documentId = nanoid();
  const r2Key = documentKey(input.orgId, documentId, input.filename);
  const mimeType = input.mimeType || "application/octet-stream";
  const fileType = detectFileType(mimeType);

  await env.DOCUMENTS.put(r2Key, input.bytes, {
    httpMetadata: { contentType: mimeType },
  });

  await db.insert(documents).values({
    id: documentId,
    orgId: input.orgId,
    uploadedBy: input.uploadedBy,
    r2Key,
    originalName: input.filename,
    mimeType,
    sizeBytes: input.bytes.byteLength,
    fileType,
    status: "queued",
  });

  if (env.DOCUMENT_QUEUE) {
    const org = await db
      .select({ vertical: organizations.vertical })
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .get();
    const job = documentJobSchema.parse({
      documentId,
      orgId: input.orgId,
      r2Key,
      mimeType,
      vertical: (org?.vertical ?? "manufacturing") as Vertical,
    });
    await env.DOCUMENT_QUEUE.send(job);
  }

  return { documentId };
}
