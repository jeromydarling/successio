import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help Center",
  description:
    "Plain-spoken guides to every Successio feature — from photographing your first document to sharing a finished profile with a buyer.",
  path: "/help",
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
