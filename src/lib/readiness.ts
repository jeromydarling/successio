import type { ReadinessBreakdown } from "@/types";

/**
 * Manufacturing vertical weights (see CLAUDE.md).
 * Add new verticals here — no other code changes needed.
 */
const WEIGHTS: Record<string, ReadinessBreakdown> = {
  manufacturing: {
    customers: 20,
    financials: 25,
    operations: 20,
    equipment: 15,
    people: 10,
    compliance: 10,
  },
  hvac:         { customers: 22, financials: 24, operations: 18, equipment: 14, people: 12, compliance: 10 },
  plumbing:     { customers: 22, financials: 24, operations: 18, equipment: 14, people: 12, compliance: 10 },
  electrical:   { customers: 20, financials: 25, operations: 18, equipment: 12, people: 12, compliance: 13 },
  construction: { customers: 18, financials: 27, operations: 20, equipment: 17, people: 10, compliance: 8 },
  trucking:     { customers: 20, financials: 25, operations: 22, equipment: 20, people: 8,  compliance: 5 },
  agriculture:  { customers: 16, financials: 24, operations: 18, equipment: 22, people: 10, compliance: 10 },
};

export interface ChecklistSignal {
  category: keyof ReadinessBreakdown;
  completed: boolean;
  /** Weight of this signal within its category (0–1, all signals in a category sum to 1). */
  weight: number;
}

/**
 * Calculates the sale readiness score from a set of checklist signals.
 * Returns the 0–100 composite score and a per-category breakdown.
 *
 * Every Workflow extraction step calls this after writing extracted_entities
 * so the dashboard always reflects the latest state.
 */
export function calculateReadiness(
  vertical: string,
  signals: ChecklistSignal[]
): { score: number; breakdown: ReadinessBreakdown } {
  const weights = WEIGHTS[vertical] ?? WEIGHTS.manufacturing;

  // Compute 0–100 per category
  const raw = { customers: 0, financials: 0, operations: 0, equipment: 0, people: 0, compliance: 0 };

  for (const signal of signals) {
    if (signal.completed) {
      raw[signal.category] = Math.min(
        100,
        raw[signal.category] + signal.weight * 100
      );
    }
  }

  // Weighted composite
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let score = 0;
  for (const [cat, w] of Object.entries(weights)) {
    score += (raw[cat as keyof typeof raw] / 100) * (w / totalWeight) * 100;
  }

  return {
    score: Math.round(score),
    breakdown: {
      customers: Math.round(raw.customers),
      financials: Math.round(raw.financials),
      operations: Math.round(raw.operations),
      equipment: Math.round(raw.equipment),
      people: Math.round(raw.people),
      compliance: Math.round(raw.compliance),
    },
  };
}
