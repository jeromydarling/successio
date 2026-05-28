/**
 * Embedding Worker — Step 4 of the document pipeline.
 * Chunks the OCR text, generates embeddings via Workers AI (bge-base-en-v1.5),
 * upserts vectors to Vectorize, and writes chunk records to D1.
 *
 * Namespace per org: `org_{orgId}` — keeps vector search scoped to a single
 * business with no cross-tenant leakage.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { makeGateway } from "@/lib/ai-gateway";
import { chunkText } from "@/lib/ocr";
import { nanoid } from "@/lib/nanoid";

export interface EmbedParams {
  documentId: string;
  orgId: string;
  ocrText: string;
  env: {
    DB: D1Database;
    AI: Ai;
    VECTORS?: VectorizeIndex;
    CF_ACCOUNT_ID?: string;
    CF_AI_GATEWAY_ID: string;
  };
}

export async function runEmbedding(params: EmbedParams): Promise<void> {
  const { documentId, orgId, ocrText, env } = params;
  const db = drizzle(env.DB, { schema });
  const gateway = makeGateway(env);

  if (!ocrText || ocrText.trim().length < 20) {
    console.info(`[embed] Document ${documentId} has no text to embed — skipping`);
    await db.update(schema.documents)
      .set({ status: "complete" })
      .where(eq(schema.documents.id, documentId));
    return;
  }

  const chunks = chunkText(ocrText, 1500, 200);
  const embeddings = await gateway.embed(chunks);

  const vectors: VectorizeVector[] = [];
  const chunkRows: typeof schema.documentChunks.$inferInsert[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const vectorId = `${orgId}:${documentId}:${i}`;
    vectors.push({
      id: vectorId,
      values: embeddings[i],
      metadata: { orgId, documentId, chunkIndex: i },
    });
    chunkRows.push({
      id: nanoid(),
      documentId,
      orgId,
      chunkIndex: i,
      text: chunks[i],
      vectorId,
    });
  }

  // Upsert to Vectorize (batched — Vectorize max is 1000 per call)
  if (env.VECTORS && vectors.length > 0) {
    for (let i = 0; i < vectors.length; i += 500) {
      await env.VECTORS.upsert(vectors.slice(i, i + 500));
    }
  }

  // Write chunk records to D1
  if (chunkRows.length > 0) {
    await db.insert(schema.documentChunks).values(chunkRows);
  }

  await db.update(schema.documents)
    .set({ status: "complete" })
    .where(eq(schema.documents.id, documentId));

  console.info(`[embed] Document ${documentId}: ${chunks.length} chunks embedded`);
}
