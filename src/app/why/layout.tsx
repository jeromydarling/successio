import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why Successio exists",
  description:
    "Millions of owners are retiring with no plan. We help the people who built a business give it a fair shot at carrying forward — whole, and local.",
  path: "/why",
});

export default function WhyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
