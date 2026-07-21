import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Successio compares",
  description:
    "Brokers, marketplaces, DIY spreadsheets — and Successio. See how getting sale-ready with the knowledge intact stacks up against the alternatives.",
  path: "/compare",
});

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
