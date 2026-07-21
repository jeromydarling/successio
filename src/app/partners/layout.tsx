import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "For associations & lenders",
  description:
    "Offer succession readiness as a member benefit. White-labeled, with an aggregate readiness dashboard across your members. Built for trade associations, CDFIs, and lenders.",
  path: "/partners",
});

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
