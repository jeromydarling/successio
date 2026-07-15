/**
 * Read-side reconciliation for the financials table.
 *
 * The dedup index is per (org, sourceDocumentId, year), so the same fiscal
 * year extracted from two different documents produces two rows. Anything
 * narrative-facing (profile draft, timeline, lender package) must collapse
 * to one row per year or buyers see conflicting numbers.
 */

interface YearRow {
  year: number;
  updatedAt?: Date | null;
  revenue?: number | null;
  grossProfit?: number | null;
  ebitda?: number | null;
  ownerCompensation?: number | null;
}

function filledFields(r: YearRow): number {
  return [r.revenue, r.grossProfit, r.ebitda, r.ownerCompensation].filter(
    (v) => v != null
  ).length;
}

/** One row per year: prefers the most complete row, breaking ties by most
 *  recently updated. Output is sorted by year ascending. */
export function dedupeFinancialsByYear<T extends YearRow>(rows: T[]): T[] {
  const byYear = new Map<number, T>();
  for (const row of rows) {
    const current = byYear.get(row.year);
    if (!current) {
      byYear.set(row.year, row);
      continue;
    }
    const rowFilled = filledFields(row);
    const curFilled = filledFields(current);
    const rowNewer = (row.updatedAt?.getTime() ?? 0) > (current.updatedAt?.getTime() ?? 0);
    if (rowFilled > curFilled || (rowFilled === curFilled && rowNewer)) {
      byYear.set(row.year, row);
    }
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}
