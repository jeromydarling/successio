import type { Metadata } from "next";

/**
 * Canonical site origin. Everything SEO-facing (canonical URLs, sitemap,
 * robots, OG image resolution) derives from this — never hard-code the domain
 * elsewhere.
 */
export const SITE_URL = "https://successio.pro";
export const SITE_NAME = "Successio";

/** Default social image — a single branded card, page-specific text overrides
 *  the title/description that crawlers show alongside it. */
const OG_IMAGE = "/og.png";

/**
 * Build a complete, length-sane Metadata object for a page. Titles are kept
 * under ~60 chars and descriptions under ~155 so search + social don't
 * truncate them, and every page gets a self-canonical URL plus page-specific
 * OpenGraph and Twitter cards.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  /** Path beginning with "/", e.g. "/pricing". Home is "/". */
  path: string;
  /** Set false for pages that should not be indexed (e.g. app shell). */
  index?: boolean;
}): Metadata {
  const url = opts.path === "/" ? SITE_URL : `${SITE_URL}${opts.path}`;
  // Titles get the brand suffix unless they already carry it; the home page
  // provides its own full title.
  const fullTitle =
    opts.path === "/" ? opts.title : `${opts.title} · ${SITE_NAME}`;

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.index === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: opts.description,
      images: [OG_IMAGE],
    },
  };
}
