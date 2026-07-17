/**
 * Numeric audit for AI-generated business profiles.
 *
 * The single most damaging AI failure mode is a wrong dollar figure in a
 * buyer-facing document. Before a profile can be published, every dollar
 * amount and percentage in the narrative must be traceable to a number in
 * the owner's actual records — anything unmatched is surfaced for the owner
 * to verify by hand.
 */

export interface AuditSource {
  financials: Array<{
    year: number;
    revenue?: number | null;
    grossProfit?: number | null;
    ebitda?: number | null;
    ownerCompensation?: number | null;
  }>;
  customers: Array<{ revenueShare?: number | null }>;
  equipment: Array<{ estimatedValue?: number | null }>;
  org: { annualRevenue?: number | null; employeeCount?: number | null; founded?: number | null };
}

export interface AuditIssue {
  /** The literal figure as it appears in the narrative, e.g. "$2.4M" or "38%". */
  figure: string;
  /** Which profile section it appears in. */
  section: string;
}

/** Collect every "known" numeric value derivable from the source records. */
function knownValues(src: AuditSource): { dollars: number[]; percents: number[] } {
  const dollars: number[] = [];
  const percents: number[] = [];

  for (const f of src.financials) {
    for (const v of [f.revenue, f.grossProfit, f.ebitda, f.ownerCompensation]) {
      if (v != null && v > 0) dollars.push(v);
    }
  }
  if (src.org.annualRevenue != null && src.org.annualRevenue > 0) dollars.push(src.org.annualRevenue);
  for (const e of src.equipment) {
    if (e.estimatedValue != null && e.estimatedValue > 0) dollars.push(e.estimatedValue);
  }
  // Sum of equipment values is a legitimate derived figure ("~$450K of equipment").
  const equipTotal = src.equipment.reduce((s, e) => s + (e.estimatedValue ?? 0), 0);
  if (equipTotal > 0) dollars.push(equipTotal);

  for (const c of src.customers) {
    if (c.revenueShare != null && c.revenueShare > 0) percents.push(c.revenueShare * 100);
  }
  // Derived: revenue growth between consecutive years, and margin ratios —
  // both routinely quoted in narratives.
  const byYear = [...src.financials]
    .filter((f) => f.revenue != null && f.revenue > 0)
    .sort((a, b) => a.year - b.year);
  for (let i = 1; i < byYear.length; i++) {
    const prev = byYear[i - 1].revenue as number;
    const cur = byYear[i].revenue as number;
    percents.push(((cur - prev) / prev) * 100);
    percents.push((cur / prev - 1) * 100);
  }
  for (const f of src.financials) {
    if (f.revenue && f.grossProfit) percents.push((f.grossProfit / f.revenue) * 100);
    if (f.revenue && f.ebitda) percents.push((f.ebitda / f.revenue) * 100);
  }

  return { dollars, percents };
}

/** Parse "$2.4M", "$450k", "$1,250,000", "$85,000" → numeric dollars. */
function parseDollar(raw: string): number | null {
  const m = raw.replace(/[,\s]/g, "").match(/^\$([\d.]+)(million|m|k|thousand)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const suffix = (m[2] ?? "").toLowerCase();
  if (suffix === "m" || suffix === "million") return n * 1_000_000;
  if (suffix === "k" || suffix === "thousand") return n * 1_000;
  return n;
}

/** A narrative figure matches a source value if within tolerance (rounding slack). */
function matches(value: number, candidates: number[], relTol: number, absTol: number): boolean {
  return candidates.some(
    (c) => Math.abs(c - value) <= Math.max(absTol, Math.abs(c) * relTol)
  );
}

/**
 * Audit a generated profile's sections against source records.
 * Returns the figures that could NOT be traced to any source number.
 */
export function auditProfileNumbers(
  content: Record<string, string>,
  src: AuditSource
): AuditIssue[] {
  const { dollars, percents } = knownValues(src);
  const issues: AuditIssue[] = [];
  const seen = new Set<string>();

  for (const [section, text] of Object.entries(content)) {
    if (typeof text !== "string") continue;

    // Dollar figures: $1,250,000 · $2.4M · $450k · $85,000 · $2.4 million
    const dollarMatches = text.match(/\$\s?[\d][\d,]*(?:\.\d+)?\s*(?:million|thousand|[MmKk])?\b/g) ?? [];
    for (const raw of dollarMatches) {
      const cleaned = raw.replace(/\s+/g, "");
      const value = parseDollar(cleaned.startsWith("$") ? cleaned : `$${cleaned}`);
      if (value === null || value === 0) continue;
      // Rounded narrative forms ("$2.4M" for 2,437,000) get 5% slack; small
      // figures get $500 absolute slack for rounding to clean numbers.
      if (!matches(value, dollars, 0.05, 500)) {
        const key = `${section}:${raw}`;
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({ figure: raw.trim(), section });
        }
      }
    }

    // Percentages: growth/margins/concentration. Years ("2019") are excluded
    // by requiring the % sign.
    const pctMatches = text.match(/\b\d{1,3}(?:\.\d+)?\s?%/g) ?? [];
    for (const raw of pctMatches) {
      const value = parseFloat(raw);
      if (Number.isNaN(value)) continue;
      // 2 percentage-points of slack — narratives round aggressively.
      if (!matches(value, percents, 0, 2)) {
        const key = `${section}:${raw}`;
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({ figure: raw.trim(), section });
        }
      }
    }
  }

  return issues;
}
