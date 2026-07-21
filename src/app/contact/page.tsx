import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Questions about Successio, a done-for-you setup, or an association partnership? Get in touch — we'd love to help you pass the torch.",
  path: "/contact",
});

const COPY = {
  partner: {
    eyebrow: "Association & Foundation partnerships",
    h1: "Offer succession readiness as a member benefit.",
    body: "Tell us about your association, MEP center, CDFI, or foundation and roughly how many members you serve. We'll set up a white-labeled instance and a guided demo, and put together a quote that scales with your membership.",
  },
  default: {
    eyebrow: "Get in touch",
    h1: "Let's talk about your handoff.",
    body: "Whether you're an owner getting ready, a buyer stepping in, or an organization that wants to bring this to its members — we'd like to hear from you.",
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const c = plan === "partner" ? COPY.partner : COPY.default;
  const subject = plan === "partner" ? "Successio — Partner inquiry" : "Successio inquiry";

  return (
    <main className="relative" id="main-content">
      <SiteNav />

      <section className="relative overflow-hidden pt-40 pb-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[320px] w-[700px] -translate-x-1/2 rounded-full bg-amber/[0.06] blur-[120px]" />
        <div className="mx-auto max-w-2xl px-5">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">{c.eyebrow}</span>
          <h1 className="mt-4 text-balance text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            {c.h1}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">{c.body}</p>

          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a href={`mailto:hello@successio.app?subject=${encodeURIComponent(subject)}`}>
              <Button size="lg" className="group">
                <Mail className="size-4" />
                Email us
              </Button>
            </a>
            <span className="font-mono text-sm text-ink-soft">hello@successio.app</span>
          </div>

          <Link
            href="/pricing"
            className="mt-12 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to pricing
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
