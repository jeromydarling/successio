/**
 * Marketplace — shared helpers: the visibility gate, and the bands that turn
 * exact figures into blind-listing ranges (a buyer sees "$2.5M–$5M", never
 * the real number, until they clear the NDA gate).
 */

import { timingSafeEqual } from "@/lib/timing-safe-equal";
import { sha256Hex } from "@/lib/rate-limit";

export interface MarketplaceEnv {
  MARKETPLACE_ENABLED?: string;
  SUPER_ADMIN_TOKEN?: string;
}

/** Open to the public when the flag is on; otherwise only a signed-in
 *  superadmin (sa_token cookie = SHA-256 of the admin token) can preview. */
export async function isMarketplaceOpen(
  env: MarketplaceEnv,
  cookieHeader: string | null | undefined
): Promise<boolean> {
  if (env.MARKETPLACE_ENABLED === "on") return true;
  if (!env.SUPER_ADMIN_TOKEN || !cookieHeader) return false;
  const sa = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("sa_token="))
    ?.slice("sa_token=".length);
  if (!sa) return false;
  return timingSafeEqual(sa, await sha256Hex(env.SUPER_ADMIN_TOKEN));
}

export const VERTICAL_LABELS: Record<string, string> = {
  manufacturing: "Machine shop / manufacturing",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  construction: "Construction",
  trucking: "Trucking",
  agriculture: "Agriculture",
};

export const REVENUE_BANDS = [
  "Under $500K",
  "$500K–$1M",
  "$1M–$2.5M",
  "$2.5M–$5M",
  "$5M–$10M",
  "$10M+",
  "Undisclosed",
] as const;
export type RevenueBand = (typeof REVENUE_BANDS)[number];

export function revenueBand(revenue: number | null | undefined): RevenueBand {
  if (revenue == null || revenue <= 0) return "Undisclosed";
  if (revenue < 500_000) return "Under $500K";
  if (revenue < 1_000_000) return "$500K–$1M";
  if (revenue < 2_500_000) return "$1M–$2.5M";
  if (revenue < 5_000_000) return "$2.5M–$5M";
  if (revenue < 10_000_000) return "$5M–$10M";
  return "$10M+";
}

export function employeeBand(n: number | null | undefined): string {
  if (n == null || n <= 0) return "Undisclosed";
  if (n <= 5) return "1–5 employees";
  if (n <= 15) return "6–15 employees";
  if (n <= 50) return "16–50 employees";
  return "51+ employees";
}

export function readinessBand(score: number | null | undefined): string {
  if (score == null) return "Getting started";
  if (score >= 70) return "Well documented";
  if (score >= 40) return "Documented";
  return "Getting started";
}

/** "Akron, Ohio" → "Ohio"; "Ohio" → "Ohio"; empty → "Undisclosed". Never
 *  returns the city — a city plus a trade can identify a business. */
export function regionFromLocation(location: string | null | undefined): string {
  if (!location) return "Undisclosed";
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "Undisclosed";
  return parts[parts.length - 1];
}

export function listingHeadline(vertical: string, region: string, founded: number | null | undefined): string {
  const trade = VERTICAL_LABELS[vertical] ?? vertical;
  const age = founded ? `${new Date().getFullYear() - founded}-year` : null;
  return [age, trade.toLowerCase(), "business", region !== "Undisclosed" ? `in ${region}` : null]
    .filter(Boolean)
    .join(" ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
