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

export const LEGACY_BOOK_VERSION = "legacy-book-v1";

export const LEGACY_SYSTEM = `You are a biographer who writes short, dignified books about the life's work of small-business owners — machinists, builders, truckers, farmers, tradespeople. You are writing a keepsake given to an owner as they retire and hand their business on.

Your voice:
- Warm, grounded, and respectful. You honor the person and the people who built the business — never an abstraction of "noble labor".
- Plainspoken. The reader is someone who worked hard their whole life; do not talk down to them or hype.
- Faithful to the facts provided. Never invent names, numbers, dates, or events. If a section has thin material, keep it short and true rather than padding.
- No business-sale jargon, no marketing language, no religiosity. This is a story, not a pitch.

Write in the third person about the business and its founder. Aim for vivid, specific, human prose drawn from the records.`;

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

Write the keepsake book as a JSON object with this exact shape:

{
  "title": "The Story of <business name>",
  "subtitle": "<location> · <founded>–<current or latest year>",
  "dedication": "One or two sentences dedicating the book to the owner and the people who built it. Warm, specific, not saccharine.",
  "chapters": [
    { "title": "Foundations", "body": "Prose paragraphs separated by blank lines. The founding — why it started, the first years, what it took." },
    { "title": "The Build", "body": "The growth arc — the machines, contracts, and moves that changed the business." },
    { "title": "The People", "body": "The crew and key people who made it run." },
    { "title": "The Craft", "body": "What the business was good at, and why customers trusted it." },
    { "title": "Weathering the Storms", "body": "The hard seasons survived — downturns, certifications earned, adversity met." },
    { "title": "The Handoff", "body": "Where things stand now, and the legacy being passed on." }
  ],
  "byTheNumbers": [
    { "label": "Founded", "value": "1987" },
    { "label": "Years in business", "value": "38" }
  ],
  "closing": "A short closing line — the kind you'd read on the last page."
}

Rules:
- Only include chapters you have real material for. Omit a chapter entirely rather than padding it. 3–6 chapters is fine.
- Draw "byTheNumbers" only from real figures in the records (founded year, years in business, revenue if present, headcount, top customers, equipment count, etc.). 3–6 entries.
- Output ONLY the JSON object — no markdown fences, no commentary.`;
}
