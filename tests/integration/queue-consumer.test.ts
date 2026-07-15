/**
 * Integration: the document-jobs queue consumer against a real D1 database
 * (Miniflare/workerd). Covers the idempotency skip, the local-dev fallback
 * path, missing-document handling, and the dead-letter path that marks
 * stranded documents failed.
 */

import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import ingestConsumer from "@/server/workers/ingest";

const db = drizzle(env.DB, { schema });

const JWT_SECRET = "integration-test-secret-32-chars!!!!";

function consumerEnv() {
  return {
    DB: env.DB,
    DOCUMENTS: env.DOCUMENTS,
    AI: {} as Ai,
    JWT_SECRET,
    CF_AI_GATEWAY_ID: "successio-test",
    DOCUMENT_QUEUE: { send: vi.fn() } as unknown as Queue,
    // No DOCUMENT_WORKFLOW binding → consumer takes the local fallback path.
    ENVIRONMENT: "test",
  };
}

function makeMessage(body: unknown) {
  return {
    id: "msg-1",
    timestamp: new Date(),
    attempts: 1,
    body,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

function makeBatch(queue: string, messages: ReturnType<typeof makeMessage>[]) {
  return { queue, messages, ackAll: vi.fn(), retryAll: vi.fn() } as unknown as MessageBatch<unknown>;
}

const ORG_ID = "itest-org-1";
const USER_ID = "itest-user-1";

function job(documentId: string) {
  return {
    documentId,
    orgId: ORG_ID,
    r2Key: `orgs/${ORG_ID}/documents/${documentId}/file.pdf`,
    mimeType: "application/pdf",
    vertical: "manufacturing",
  };
}

async function seedDocument(id: string, status = "queued") {
  await db.insert(schema.documents).values({
    id,
    orgId: ORG_ID,
    uploadedBy: USER_ID,
    r2Key: job(id).r2Key,
    originalName: "file.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1234,
    status,
  });
}

beforeAll(async () => {
  await db.insert(schema.organizations).values({
    id: ORG_ID,
    name: "Integration Test Machining",
    vertical: "manufacturing",
  });
  await db.insert(schema.users).values({
    id: USER_ID,
    orgId: ORG_ID,
    email: "e2e+integration@successio.pro",
    name: "Test Owner",
    passwordHash: "pbkdf2:00:00",
  });
});

describe("document-jobs consumer", () => {
  it("processes a queued document via the fallback path and acks", async () => {
    await seedDocument("doc-queued");
    const msg = makeMessage(job("doc-queued"));

    await ingestConsumer.queue(makeBatch("document-jobs", [msg]), consumerEnv() as never);

    expect(msg.ack).toHaveBeenCalled();
    expect(msg.retry).not.toHaveBeenCalled();
    const doc = await db
      .select({ status: schema.documents.status })
      .from(schema.documents)
      .where(eq(schema.documents.id, "doc-queued"))
      .get();
    expect(doc?.status).toBe("extracting"); // fallback path (no workflow binding)
  });

  it("skips (acks) documents that are already past queued — idempotency", async () => {
    await seedDocument("doc-done", "complete");
    const msg = makeMessage(job("doc-done"));

    await ingestConsumer.queue(makeBatch("document-jobs", [msg]), consumerEnv() as never);

    expect(msg.ack).toHaveBeenCalled();
    const doc = await db
      .select({ status: schema.documents.status })
      .from(schema.documents)
      .where(eq(schema.documents.id, "doc-done"))
      .get();
    expect(doc?.status).toBe("complete"); // untouched
  });

  it("acks (not retries) jobs for documents that don't exist", async () => {
    const msg = makeMessage(job("doc-ghost"));
    await ingestConsumer.queue(makeBatch("document-jobs", [msg]), consumerEnv() as never);
    expect(msg.ack).toHaveBeenCalled();
    expect(msg.retry).not.toHaveBeenCalled();
  });

  it("retries malformed job payloads", async () => {
    const msg = makeMessage({ nonsense: true });
    await ingestConsumer.queue(makeBatch("document-jobs", [msg]), consumerEnv() as never);
    expect(msg.retry).toHaveBeenCalled();
  });

  it("dead-letter queue marks the document failed with a retryable message", async () => {
    await seedDocument("doc-dlq", "queued");
    const msg = makeMessage(job("doc-dlq"));

    await ingestConsumer.queue(makeBatch("document-jobs-dlq", [msg]), consumerEnv() as never);

    expect(msg.ack).toHaveBeenCalled();
    const doc = await db
      .select({ status: schema.documents.status, errorMessage: schema.documents.errorMessage })
      .from(schema.documents)
      .where(eq(schema.documents.id, "doc-dlq"))
      .get();
    expect(doc?.status).toBe("failed");
    expect(doc?.errorMessage).toContain("Retry");
  });
});
