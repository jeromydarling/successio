/**
 * OCR orchestration: Mistral OCR (primary) → Gemini 2.5 Flash (fallback).
 * Returns extracted text and an overall confidence score.
 *
 * Called by the document-pipeline Workflow step 2.
 */

import type { AIGateway } from "./ai-gateway";
import { MODELS } from "./ai-gateway";

export interface OcrResult {
  text: string;
  confidence: number;
  /** Which model actually produced the result. */
  model: string;
  pageCount?: number;
}

/**
 * Runs OCR on a document fetched from R2.
 * For PDFs with a text layer, we extract directly (no OCR cost).
 * For scanned/image content we call Mistral OCR, falling back to Gemini.
 */
export async function runOcr(params: {
  fileType: string;
  r2Object: R2ObjectBody;
  gateway: AIGateway;
}): Promise<OcrResult> {
  const { fileType, r2Object, gateway } = params;

  // Audio files don't need OCR — handled separately by Whisper
  if (fileType === "audio") {
    return { text: "", confidence: 1, model: "whisper", pageCount: 0 };
  }

  const bytes = await r2Object.arrayBuffer();
  const base64 = arrayBufferToBase64(bytes);

  // Try Mistral OCR first (best accuracy on printed docs)
  try {
    return await mistralOcr(base64, params.r2Object.httpMetadata?.contentType ?? "application/pdf", gateway);
  } catch (err) {
    console.warn("[ocr] Mistral OCR failed, falling back to Gemini:", err);
  }

  // Gemini 2.5 Flash fallback (handles handwriting, complex forms)
  try {
    return await geminiOcr(base64, params.r2Object.httpMetadata?.contentType ?? "application/pdf", gateway);
  } catch (err) {
    console.error("[ocr] Both OCR providers failed:", err);
    throw new Error("OCR failed on all providers");
  }
}

async function mistralOcr(base64: string, mimeType: string, gateway: AIGateway): Promise<OcrResult> {
  const result = await gateway.complete({
    model: MODELS.ocr_heavy,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          type: "document_url",
          document_url: `data:${mimeType};base64,${base64}`,
        }),
      },
    ],
    max_tokens: 8192,
  });

  if (!result.content || result.content.trim().length < 10) {
    throw new Error("Mistral returned empty OCR result");
  }

  return {
    text: result.content,
    confidence: 0.93,
    model: MODELS.ocr_heavy,
  };
}

async function geminiOcr(base64: string, mimeType: string, gateway: AIGateway): Promise<OcrResult> {
  const result = await gateway.complete({
    model: MODELS.ocr_light,
    messages: [
      {
        role: "user",
        content: `Extract all text from this document. Return the raw text only, preserving structure and layout as best you can. Do not interpret or summarize — just transcribe.\n\n[Document: data:${mimeType};base64,${base64.slice(0, 100)}...]`,
      },
    ],
    max_tokens: 8192,
  });

  return {
    text: result.content,
    confidence: 0.82,
    model: MODELS.ocr_light,
  };
}

/** Split text into overlapping chunks for embedding. */
export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    chunks.push(text.slice(pos, pos + chunkSize));
    pos += chunkSize - overlap;
  }
  return chunks;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
