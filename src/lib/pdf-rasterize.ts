/**
 * Rasterize PDF pages to PNG images using Cloudflare Browser Rendering.
 *
 * Needed only for SCANNED PDFs (no text layer) — env.AI.toMarkdown() handles
 * digital PDFs. We launch a headless browser, render each page with PDF.js to a
 * canvas, and screenshot it; the caller runs each PNG through the vision model.
 *
 * Dormant unless the BROWSER binding exists (Browser Rendering enabled + bound
 * in wrangler.toml). Every failure degrades to [] so the pipeline falls back to
 * flagging the document for review rather than crashing.
 */

const PDFJS_VERSION = "4.6.82";
const MAX_PAGES = 10; // bound cost/time

/** Returns one PNG ArrayBuffer per rendered page, or [] on any failure. */
export async function rasterizePdf(
  browserBinding: unknown,
  pdfBytes: ArrayBuffer
): Promise<ArrayBuffer[]> {
  if (!browserBinding) return [];

  // The puppeteer/browser surface is an external integration boundary; keep it
  // loosely typed and lean on the try/catch + dormant binding for safety.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let browser: any;
  try {
    const puppeteer = (await import("@cloudflare/puppeteer")).default as any;
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();

    const base64 = arrayBufferToBase64(pdfBytes);

    const dataUrls = (await page.evaluate(
      async (b64: string, version: string, maxPages: number) => {
        const pdfjs: any = await import(
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.min.mjs`
        );
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        const out: string[] = [];
        const count = Math.min(pdf.numPages, maxPages);
        for (let p = 1; p <= count; p++) {
          const pg = await pdf.getPage(p);
          const viewport = pg.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(viewport.width, 1600);
          canvas.height = Math.min(viewport.height, 2200);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await pg.render({ canvasContext: ctx, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        return out;
      },
      base64,
      PDFJS_VERSION,
      MAX_PAGES
    )) as string[];

    return dataUrls.map(dataUrlToArrayBuffer).filter((b): b is ArrayBuffer => b !== null);
  } catch (err) {
    console.warn("[pdf-rasterize] failed, falling back to review:", err);
    return [];
  } finally {
    try { await browser?.close(); } catch { /* ignore */ }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
