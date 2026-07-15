/**
 * Tier-based section filtering for shared business profiles.
 * This is the single gate between confidential profile content and the
 * public internet — every share/deal-room response flows through it.
 */

const PUBLIC_KEYS = ["executive_summary", "business_overview", "opportunity"];
const NDA_KEYS = [
  ...PUBLIC_KEYS,
  "customer_overview",
  "financial_highlights",
  "operations",
  "team",
  "equipment_and_assets",
  "reason_for_sale",
];

export function filterByTier(
  content: Record<string, string>,
  tier: string
): Record<string, string> {
  // Unknown tiers fail closed to the public (teaser) subset.
  const allowed = tier === "nda" || tier === "lender" || tier === "buyer" ? NDA_KEYS : PUBLIC_KEYS;
  return Object.fromEntries(
    Object.entries(content).filter(([k]) => allowed.includes(k))
  );
}
