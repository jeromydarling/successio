/**
 * "The Story of Your Business" — legacy book narrative synthesis.
 *
 * Turns a business's extracted records (milestones, financials, people,
 * customers, craft) into a warm, chaptered memoir — the keepsake an
 * association gifts a retiring owner, or an owner orders for their family.
 *
 * Voice: the worker-dignity register — serious, warm, plainspoken, faithful to
 * the data. A memoir, not a CIM. Never invents facts; thin data → shorter book.
 */

export const LEGACY_BOOK_VERSION = "legacy-book-v2";

export const LEGACY_SYSTEM = `You are a biographer who writes short, dignified books about the life's work of small-business owners — machinists, builders, truckers, farmers, tradespeople. You are writing a keepsake given to an owner as they retire and hand their business on.

Your voice:
- Warm, grounded, and respectful. You honor the person and the people who built the business — never an abstraction of "noble labor".
- Plainspoken. The reader is someone who worked hard their whole life; do not talk down to them or hype.
- Faithful to the facts provided. Never invent names, numbers, dates, or events. If a section has thin material, keep it short and true rather than padding.
- No business-sale jargon, no marketing language, no religiosity. This is a story, not a pitch.

Write in the third person about the business and its founder. Draw vivid, specific, human detail from the records.

You output only JSON.`;

export interface LegacyBookContext {
  org: { name: string; vertical: string; location?: string | null; founded?: number | null; employeeCount?: number | null };
  milestones: { year: number; category: string; title: string; description: string; metricLabel?: string | null; metricValue?: string | null }[];
  financials: { year: number; revenue?: number | null; grossProfit?: number | null; ebitda?: number | null }[];
  employees: { name: string; role: string; tenureYears?: number | null; isKeyPerson?: boolean }[];
  customers: { name: string; revenueShare?: number | null; contractStatus?: string | null }[];
  processes: { title: string }[];
  profile?: Record<string, string> | null;
}

export function buildLegacyBookPrompt(ctx: LegacyBookContext): string {
  const data = {
    business: ctx.org,
    milestones: ctx.milestones,
    financials: ctx.financials,
    people: ctx.employees,
    customers: ctx.customers.map((c) => ({ name: c.name, contract: c.contractStatus })),
    processes: ctx.processes.map((p) => p.title),
    existing_profile_prose: ctx.profile ?? undefined,
  };

  return `Here is everything we know about this business, extracted from its own documents and the owner's own words:

<records>
${JSON.stringify(data, null, 2)}
</records>

Write the keepsake book as a single JSON object with EXACTLY this shape:

{
  "title": "The Story of <business name>",
  "subtitle": "<location> · <founded>–<latest year>",
  "dedication": "One or two warm, specific sentences dedicating the book to the owner and the people who built it.",
  "chapters": [
    {
      "title": "Foundations",
      "paragraphs": ["First paragraph of prose.", "Second paragraph.", "Optional third."]
    }
  ],
  "byTheNumbers": [
    { "label": "Founded", "value": "1987" },
    { "label": "Years in business", "value": "38" }
  ],
  "closing": "A short closing line — the kind you'd read on the last page."
}

Suggested chapters (include only the ones you have real material for; omit any you can't support — 3 to 6 total):
- "Foundations" — why it started, the first years, what it took.
- "The Build" — the growth arc; the machines, contracts, and moves that changed the business.
- "The People" — the crew and key people who made it run.
- "The Craft" — what the business was good at, and why customers trusted it.
- "Weathering the Storms" — hard seasons survived; downturns, certifications earned, adversity met.
- "The Handoff" — where things stand now, and the legacy being passed on.

STRICT OUTPUT RULES:
- Output ONLY the JSON object. No markdown fences, no text before or after.
- Each chapter's "paragraphs" is an ARRAY of plain strings — one string per paragraph. Do NOT put newline characters inside any string.
- Keep each paragraph to 2–4 sentences; each chapter to 2–3 paragraphs.
- "byTheNumbers": 3–6 entries, drawn only from real figures in the records (founded year, years in business, revenue, headcount, top customers, equipment count).
- Use straight quotes and valid JSON. Do not include trailing commas.`;
}
