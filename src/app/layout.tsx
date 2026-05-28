import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
