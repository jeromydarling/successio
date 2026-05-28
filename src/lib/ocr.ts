/**
 * OCR / text extraction, Workers-AI-only edition.
 *  - text & CSV (incl. QuickBooks exports): decoded directly, no model.
 *  - images: transcribed with a Workers AI Llama vision model.
 *  - PDFs/DOCX: best-effort text decode (no external OCR provider wired yet).
 *  - audio: handled by Whisper elsewhere.
 *
 * Called by the document-pipeline Workflow step 2.
 */

import type { AIGateway } from "./ai-gateway";

export interface OcrResult {
  text: string;
  confidence: number;
  /** Which path actually produced the result. */
  model: string;
  pageCount?: number;
}

function isTextLike(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime.includes("csv") ||
    mime.includes("json") ||
    mime.includes("plain")
  );
}

function decodeUtf8(bytes: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

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

  const mime = r2Object.httpMetadata?.contentType ?? "";
  const bytes = await r2Object.arrayBuffer();

  // Plain-text formats (CSV, TXT, JSON exports): read directly.
  if (isTextLike(mime) || fileType === "spreadsheet") {
    const text = decodeUtf8(bytes).trim();
    if (text.length > 0) {
      return { text, confidence: 0.99, model: "direct-text" };
    }
  }

  // Images: Workers AI vision transcription.
  if (mime.startsWith("image/") || fileType === "image") {
    const text = (await gateway.ocrImage(bytes)).trim();
    return { text, confidence: text.length > 10 ? 0.78 : 0, model: "llama-vision" };
  }

  // PDFs / DOCX: best-effort. Many PDFs embed extractable ASCII; pull what we can.
  const raw = decodeUtf8(bytes);
  const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "  ").trim();
  if (printable.length >= 40) {
    return { text: printable, confidence: 0.55, model: "text-extract" };
  }

  // Couldn't read it without an external OCR provider.
  return { text: "", confidence: 0, model: "none" };
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
