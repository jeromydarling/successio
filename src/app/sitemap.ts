import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { HELP_ARTICLES } from "@/lib/help/articles";

/**
 * Sitemap of every indexable public URL: marketing pages, legal pages, the
 * help center index, and every help article. The authenticated app and
 * token-gated share links are deliberately excluded (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketing: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/why", priority: 0.8, freq: "monthly" },
    { path: "/pricing", priority: 0.9, freq: "monthly" },
    { path: "/partners", priority: 0.8, freq: "monthly" },
    { path: "/compare", priority: 0.7, freq: "monthly" },
    { path: "/demo", priority: 0.6, freq: "monthly" },
    { path: "/contact", priority: 0.5, freq: "yearly" },
    { path: "/help", priority: 0.7, freq: "weekly" },
    { path: "/terms", priority: 0.3, freq: "yearly" },
    { path: "/privacy", priority: 0.3, freq: "yearly" },
    { path: "/security", priority: 0.4, freq: "yearly" },
  ];

  const marketingEntries: MetadataRoute.Sitemap = marketing.map((m) => ({
    url: m.path === "/" ? SITE_URL : `${SITE_URL}${m.path}`,
    lastModified: now,
    changeFrequency: m.freq,
    priority: m.priority,
  }));

  const helpEntries: MetadataRoute.Sitemap = HELP_ARTICLES.map((a) => ({
    url: `${SITE_URL}/help/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...marketingEntries, ...helpEntries];
}
