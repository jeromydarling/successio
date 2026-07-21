import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Crawler rules. Public marketing + help pages are open; the authenticated
 * app, admin/superadmin areas, API, and unguessable share/deal-room links are
 * kept out of the index (share links carry confidential business data behind a
 * token — they must never be crawled or cached by search engines).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/upload",
          "/vault",
          "/data",
          "/knowledge",
          "/history",
          "/legacy",
          "/profile",
          "/settings",
          "/admin",
          "/superadmin",
          "/share/",
          "/login",
          "/signup",
          "/reset-password",
          "/forgot-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
