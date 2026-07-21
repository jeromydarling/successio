import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Live demo",
  description:
    "Explore Successio with a real, fully-documented example business — dashboard, document vault, readiness score, and a buyer-ready deal room. No signup needed.",
  path: "/demo",
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
