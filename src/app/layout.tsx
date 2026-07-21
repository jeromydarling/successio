import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Successio — Pass the torch, not the knowledge with it.",
    // Child pages set just their own title; this frames it site-wide.
    template: "%s · Successio",
  },
  description:
    "Document your business, capture the know-how in your head, and hand a buyer a sale-ready profile. Built for retiring owners in the trades.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: [
    "sell my business",
    "business succession",
    "exit planning",
    "machine shop for sale",
    "trades business valuation",
    "confidential information memorandum",
    "small business sale readiness",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Successio — Pass the torch, not the knowledge with it.",
    description:
      "Turn 30 years of tribal knowledge into a sale-ready business profile. Built for the trades.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Successio — Pass the torch, not the knowledge with it.",
    description:
      "Turn 30 years of tribal knowledge into a sale-ready business profile. Built for the trades.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  // Google Search Console verification — set NEXT_PUBLIC_GSC_VERIFICATION as a
  // build var to the token from the "HTML tag" method (or verify via DNS TXT
  // and leave this unset).
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Google Analytics 4 — federated CROS Family stream */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RKF41M29QE"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-RKF41M29QE', { cros_app: 'successio' });`}
        </Script>
        {/* Structured data — Organization + WebSite for rich results. */}
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#org`,
                name: SITE_NAME,
                url: SITE_URL,
                logo: `${SITE_URL}/og.png`,
                description:
                  "Successio helps retiring small-business owners document their business, capture tribal knowledge, and generate a buyer-ready profile.",
                sameAs: [],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: SITE_NAME,
                publisher: { "@id": `${SITE_URL}/#org` },
              },
            ],
          })}
        </Script>
      </head>
      <body className="antialiased">
        {/* Keyboard/screen-reader users can jump straight past the nav. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-amber focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
