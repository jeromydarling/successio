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
import { rasterizePdf } from "./pdf-rasterize";

export interface OcrResult {
  text: string;
  confidence: number;
  /** Which path actually produced the result. */
  model: string;
  pageCount?: number;
}

function decodeUtf8(bytes: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export async function runOcr(params: {
  fileType: string;
  fileName: string;
  r2Object: R2ObjectBody;
  gateway: AIGateway;
  /** Browser Rendering binding — enables scanned-PDF rasterization when present. */
  browser?: unknown;
}): Promise<OcrResult> {
  const { fileType, fileName, r2Object, gateway, browser } = params;

  // Audio files don't need OCR — handled separately by Whisper
  if (fileType === "audio") {
    return { text: "", confidence: 1, model: "whisper", pageCount: 0 };
  }

  const mime = r2Object.httpMetadata?.contentType ?? "";
  const bytes = await r2Object.arrayBuffer();

  // Images: send straight to the vision model (toMarkdown only captions images).
  if (mime.startsWith("image/") || fileType === "image") {
    const text = (await gateway.ocrImage(bytes)).trim();
    return { text, confidence: text.length > 10 ? 0.78 : 0, model: "llama-vision" };
  }

  // Everything else (PDF, DOCX, XLSX, CSV, HTML, JSON, TXT): Workers AI
  // document → Markdown conversion. Free, structure-preserving, on-binding.
  const md = (await gateway.toMarkdown(fileName, bytes)).trim();
  if (md.length >= 20) {
    return { text: md, confidence: 0.9, model: "workers-ai-markdown" };
  }

  // Plain-text fallback for anything toMarkdown didn't handle.
  const decoded = decodeUtf8(bytes).replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
  if (decoded.length >= 40) {
    return { text: decoded, confidence: 0.55, model: "text-extract" };
  }

  // Likely a scanned PDF with no text layer.
  if (mime.includes("pdf")) {
    // Primary (when MISTRAL_API_KEY is provisioned): Mistral Document AI —
    // purpose-built OCR, ~95% accuracy on printed docs. Returns null when the
    // key isn't set or the call fails, so the raster path below still runs.
    const mistralText = await gateway.ocrPdfMistral(bytes);
    if (mistralText && mistralText.length > 10) {
      return { text: mistralText, confidence: 0.9, model: "mistral-ocr" };
    }

    // Fallback: Browser Rendering — rasterize pages, OCR each with the vision
    // model. Skipped when the BROWSER binding is absent.
    if (browser) {
      const pages = await rasterizePdf(browser, bytes);
      if (pages.length > 0) {
        const transcripts: string[] = [];
        for (const png of pages) {
          const t = (await gateway.ocrImage(png)).trim();
          if (t) transcripts.push(t);
        }
        const joined = transcripts.join("\n\n").trim();
        if (joined.length > 10) {
          return { text: joined, confidence: 0.7, model: "browser-raster+vision", pageCount: pages.length };
        }
      }
    }
  }

  // Couldn't extract text — flag for human review rather than fake output.
  return { text: "", confidence: 0, model: mime.includes("pdf") ? "scanned-pdf" : "none" };
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
