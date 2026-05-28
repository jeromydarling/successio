/**
 * Minimal, dependency-free PDF generator for business-profile (CIM) export.
 *
 * Why hand-rolled: the Workers runtime (workerd) can't reliably bundle
 * browser-oriented PDF libraries. This writes a valid multi-page PDF using the
 * built-in Helvetica fonts — text only, which is all the CIM needs — and is
 * fully self-contained and unit-testable.
 */

const PAGE_W = 612; // Letter, points
const PAGE_H = 792;
const MARGIN = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Approximate Helvetica advance widths (fraction of font size) for wrapping.
function textWidth(text: string, fontSize: number): number {
  // Average advance ~0.5em is close enough for conservative wrapping.
  return text.length * fontSize * 0.5;
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

interface Line {
  text: string;
  font: "F1" | "F2"; // F1 = Helvetica, F2 = Helvetica-Bold
  size: number;
  gapAfter: number;
}

export interface ProfilePdfInput {
  orgName: string;
  subtitle?: string;
  sections: { heading: string; body: string }[];
}

/** Lay out the profile into wrapped lines, then paginate. */
function layout(input: ProfilePdfInput): Line[] {
  const lines: Line[] = [];

  lines.push({ text: input.orgName, font: "F2", size: 24, gapAfter: 6 });
  if (input.subtitle) {
    lines.push({ text: input.subtitle, font: "F1", size: 11, gapAfter: 18 });
  }

  for (const section of input.sections) {
    lines.push({ text: section.heading, font: "F2", size: 15, gapAfter: 4 });
    const paragraphs = section.body.split(/\n+/).filter((p) => p.trim());
    for (const para of paragraphs) {
      for (const wrapped of wrapLine(para.trim(), 11, CONTENT_W)) {
        lines.push({ text: wrapped, font: "F1", size: 11, gapAfter: 2 });
      }
      lines[lines.length - 1].gapAfter = 8;
    }
    lines[lines.length - 1].gapAfter = 18;
  }

  return lines;
}

function paginate(lines: Line[]): Line[][] {
  const pages: Line[][] = [];
  let page: Line[] = [];
  let y = PAGE_H - MARGIN;
  for (const line of lines) {
    const advance = line.size + line.gapAfter;
    if (y - advance < MARGIN) {
      pages.push(page);
      page = [];
      y = PAGE_H - MARGIN;
    }
    page.push(line);
    y -= advance;
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function buildContentStream(page: Line[]): string {
  let y = PAGE_H - MARGIN;
  let out = "BT\n";
  for (const line of page) {
    y -= line.size;
    out += `/${line.font} ${line.size} Tf\n`;
    out += `1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm\n`;
    out += `(${escapePdfText(line.text)}) Tj\n`;
    y -= line.gapAfter;
  }
  out += "ET";
  return out;
}

/** Render the profile to PDF bytes. */
export function renderProfilePdf(input: ProfilePdfInput): Uint8Array {
  const pages = paginate(layout(input));

  // Object plan:
  // 1: Catalog, 2: Pages, 3: Font Helvetica, 4: Font Helvetica-Bold,
  // then for each page: a Page object and a Contents object.
  const objects: string[] = [];
  const pageObjNums: number[] = [];

  const firstPageObj = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(firstPageObj + i * 2);
  }

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pageObjNums[i];
    const contentNum = pageNum + 1;
    const stream = buildContentStream(pages[i]);
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }

  // Serialize with an xref table.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  const totalObjects = objects.length - 1; // index 0 unused

  for (let n = 1; n <= totalObjects; n++) {
    offsets[n] = pdf.length;
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${totalObjects + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (let n = 1; n <= totalObjects; n++) {
    pdf += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
