import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
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
  title: "Successio — Pass the torch, not the knowledge with it.",
  description:
    "Successio helps retiring owners of machine shops, trades, trucking and farms document the business, capture the know-how locked in their heads, and hand a buyer a story worth buying.",
  metadataBase: new URL("https://successio.app"),
  openGraph: {
    title: "Successio — Pass the torch, not the knowledge with it.",
    description:
      "Turn 30 years of tribal knowledge into a sale-ready business profile. Built for the trades.",
    type: "website",
  },
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
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
