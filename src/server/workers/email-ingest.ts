/**
 * Email Workers handler: forward documents to the ingest pipeline.
 *
 * Owners (or their advisors) email/forward documents to a Successio address.
 * We identify the org from the sender's email, store each attachment in R2,
 * create document records, and enqueue them onto the same document-jobs queue
 * the upload flow uses — so emailed files flow through OCR → extract → score
 * exactly like uploaded ones.
 *
 * Wired via the worker entry's `email()` handler (see worker.ts).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import PostalMime from "postal-mime";
import * as schema from "@/db/schema";
import { documentKey, detectFileType } from "@/lib/r2";
import { documentJobSchema } from "@/types";
import { nanoid } from "@/lib/nanoid";
import type { Vertical } from "@/lib/verticals";

export interface EmailEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  DOCUMENT_QUEUE?: Queue;
}

/** Minimal shape of Cloudflare's ForwardableEmailMessage we rely on. */
export interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array>;
  setReject(reason: string): void;
}

/** Process one inbound email. Exported for testing and reuse. */
export async function handleEmail(message: EmailMessage, env: EmailEnv): Promise<void> {
  const db = drizzle(env.DB, { schema });

  // Identify the org from the sender. Unknown senders are rejected.
  const sender = message.from.toLowerCase().trim();
  const user = await db
    .select({ orgId: schema.users.orgId, id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, sender))
    .get();

  if (!user) {
    message.setReject("Sender is not a registered Successio user");
    return;
  }

  const org = await db
    .select({ vertical: schema.organizations.vertical })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, user.orgId))
    .get();
  const vertical = (org?.vertical ?? "manufacturing") as Vertical;

  // Parse the MIME message and pull attachments.
  const parsed = await PostalMime.parse(message.raw);
  const attachments = parsed.attachments ?? [];

  if (attachments.length === 0) {
    // No attachments — nothing to ingest. Accept silently.
    return;
  }

  for (const att of attachments) {
    const filename = att.filename || `email-attachment-${nanoid(6)}`;
    const mimeType = att.mimeType || "application/octet-stream";
    const content = att.content; // ArrayBuffer | string
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : new Uint8Array(content);

    const documentId = nanoid();
    const r2Key = documentKey(user.orgId, documentId, filename);

    await env.DOCUMENTS.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });

    await db.insert(schema.documents).values({
      id: documentId,
      orgId: user.orgId,
      uploadedBy: user.id,
      r2Key,
      originalName: filename,
      mimeType,
      sizeBytes: bytes.byteLength,
      fileType: detectFileType(mimeType),
      status: "queued",
    });

    if (env.DOCUMENT_QUEUE) {
      const job = documentJobSchema.parse({
        documentId,
        orgId: user.orgId,
        r2Key,
        mimeType,
        vertical,
      });
      await env.DOCUMENT_QUEUE.send(job);
    }
  }
}
