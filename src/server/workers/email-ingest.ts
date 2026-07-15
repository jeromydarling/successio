/**
 * Email Workers handler: forward documents to the ingest pipeline.
 *
 * Owners (or their advisors) email/forward documents to their org's private
 * ingest address: docs+<orgId>@successio.pro. The unguessable org id in the
 * recipient is the credential — we deliberately do NOT trust the From header,
 * which is trivially spoofable and would let an attacker inject documents
 * into someone else's business profile.
 *
 * Each attachment is stored in R2, recorded in D1, and enqueued onto the same
 * document-jobs queue the upload flow uses — so emailed files flow through
 * OCR → extract → score exactly like uploaded ones.
 *
 * Wired via the worker entry's `email()` handler (see worker.ts).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
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

/** Abuse caps — an email is a small batch, not a bulk-upload channel. */
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

/** Extract the org token from a plus-addressed recipient (docs+<orgId>@…).
 *  Case is preserved — org ids are case-sensitive nanoids. */
export function orgTokenFromRecipient(to: string): string | null {
  const match = to.trim().match(/^[^+@\s]+\+([A-Za-z0-9_-]+)@/);
  return match?.[1] ?? null;
}

/** Process one inbound email. Exported for testing and reuse. */
export async function handleEmail(message: EmailMessage, env: EmailEnv): Promise<void> {
  const db = drizzle(env.DB, { schema });

  // Identify the org from the recipient's plus-address token. The From header
  // is spoofable, so it is never used for authorization.
  const orgToken = orgTokenFromRecipient(message.to);
  if (!orgToken) {
    message.setReject("Use your business's private ingest address (docs+<id>@successio.pro)");
    return;
  }

  const org = await db
    .select({ id: schema.organizations.id, vertical: schema.organizations.vertical })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgToken))
    .get();

  if (!org) {
    message.setReject("Unknown ingest address");
    return;
  }

  const orgId = org.id;
  const vertical = (org.vertical ?? "manufacturing") as Vertical;

  // Attribute the upload to the org owner (the sender may be an advisor
  // forwarding from any address — the recipient token is the credential).
  const owner = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, "owner")))
    .get();

  if (!owner) {
    message.setReject("This business has no active owner account");
    return;
  }

  // Parse the MIME message and pull attachments.
  const parsed = await PostalMime.parse(message.raw);
  const attachments = (parsed.attachments ?? []).slice(0, MAX_ATTACHMENTS);

  if (attachments.length === 0) {
    // No attachments — nothing to ingest. Accept silently.
    return;
  }

  for (const att of attachments) {
    const filename = att.filename || `email-attachment-${nanoid(6)}`;
    const mimeType = att.mimeType || "application/octet-stream";
    const content = att.content; // ArrayBuffer | string
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : new Uint8Array(content);

    if (bytes.byteLength === 0 || bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      console.warn(`[email-ingest] skipping ${filename}: ${bytes.byteLength} bytes (cap ${MAX_ATTACHMENT_BYTES})`);
      continue;
    }

    const documentId = nanoid();
    const r2Key = documentKey(orgId, documentId, filename);

    await env.DOCUMENTS.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });

    await db.insert(schema.documents).values({
      id: documentId,
      orgId,
      uploadedBy: owner.id,
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
        orgId,
        r2Key,
        mimeType,
        vertical,
      });
      await env.DOCUMENT_QUEUE.send(job);
    }
  }
}
