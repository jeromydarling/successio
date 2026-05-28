/**
 * Association white-label configuration.
 * Values come from Cloudflare env vars set per deployment.
 * Defaults to Successio branding when no association is configured.
 *
 * Add per-association config in wrangler.toml [vars]:
 *   ASSOCIATION_NAME = "NTMA"
 *   ASSOCIATION_FULL_NAME = "National Tooling & Machining Association"
 *   ASSOCIATION_SLUG = "ntma"
 *   ASSOCIATION_PRIMARY_COLOR = "#0047AB"
 *   ASSOCIATION_LOGO_URL = "https://..."
 *   ASSOCIATION_WEBSITE = "https://ntma.org"
 */

export interface AssociationConfig {
  name: string;
  fullName: string;
  slug: string;
  primaryColor: string;
  logoUrl: string | null;
  website: string | null;
  isConfigured: boolean;
}

const DEFAULTS: AssociationConfig = {
  name: "Successio",
  fullName: "Successio",
  slug: "successio",
  primaryColor: "#f59e0b",
  logoUrl: null,
  website: null,
  isConfigured: false,
};

export function getAssociationConfig(env: Record<string, string | undefined>): AssociationConfig {
  const slug = env.ASSOCIATION_SLUG;
  if (!slug) return DEFAULTS;

  return {
    name:         env.ASSOCIATION_NAME        ?? slug.toUpperCase(),
    fullName:     env.ASSOCIATION_FULL_NAME   ?? env.ASSOCIATION_NAME ?? slug,
    slug,
    primaryColor: env.ASSOCIATION_PRIMARY_COLOR ?? DEFAULTS.primaryColor,
    logoUrl:      env.ASSOCIATION_LOGO_URL    ?? null,
    website:      env.ASSOCIATION_WEBSITE     ?? null,
    isConfigured: true,
  };
}

/** Known association configurations for the NTMA pilot and beyond. */
export const KNOWN_ASSOCIATIONS: Record<string, Omit<AssociationConfig, "isConfigured">> = {
  ntma: {
    name: "NTMA",
    fullName: "National Tooling & Machining Association",
    slug: "ntma",
    primaryColor: "#1a3a8f",
    logoUrl: null,
    website: "https://www.ntma.org",
  },
  pmpa: {
    name: "PMPA",
    fullName: "Precision Machined Products Association",
    slug: "pmpa",
    primaryColor: "#c1272d",
    logoUrl: null,
    website: "https://www.pmpa.org",
  },
  acca: {
    name: "ACCA",
    fullName: "Air Conditioning Contractors of America",
    slug: "acca",
    primaryColor: "#0072b5",
    logoUrl: null,
    website: "https://www.acca.org",
  },
  phcc: {
    name: "PHCC",
    fullName: "Plumbing-Heating-Cooling Contractors National Association",
    slug: "phcc",
    primaryColor: "#003f7d",
    logoUrl: null,
    website: "https://www.phccweb.org",
  },
};
