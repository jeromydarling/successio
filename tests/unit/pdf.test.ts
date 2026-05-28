import { describe, it, expect } from "vitest";
import { renderProfilePdf } from "@/lib/pdf";

describe("renderProfilePdf", () => {
  const sample = {
    orgName: "Brenner Precision Machining",
    subtitle: "Manufacturing · Akron, Ohio · Established 1987",
    sections: [
      { heading: "Executive Summary", body: "A 38-year-old precision machine shop with a diversified customer base and a documented quality system." },
      { heading: "Financial Highlights", body: "Revenue grew from $410K in 1990 to $6.24M in 2025.\nEBITDA margins are healthy and stable." },
    ],
  };

  it("produces a valid PDF document", () => {
    const bytes = renderProfilePdf(sample);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("startxref");
  });

  it("embeds the org name and section headings", () => {
    const text = new TextDecoder().decode(renderProfilePdf(sample));
    expect(text).toContain("Brenner Precision Machining");
    expect(text).toContain("Executive Summary");
    expect(text).toContain("Financial Highlights");
  });

  it("paginates long content into multiple pages", () => {
    const longBody = Array.from({ length: 200 }, (_, i) => `Line ${i} of a very long operations narrative.`).join(" ");
    const text = new TextDecoder().decode(
      renderProfilePdf({ orgName: "Big Co", sections: [{ heading: "Operations", body: longBody }] })
    );
    const pageCount = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
  });

  it("escapes parentheses so the PDF stays well-formed", () => {
    const text = new TextDecoder().decode(
      renderProfilePdf({ orgName: "Acme (Holdings)", sections: [{ heading: "Note", body: "Owner comp (add-back) applies." }] })
    );
    expect(text).toContain("Acme \\(Holdings\\)");
    expect(text).toContain("(add-back\\)");
  });
});
