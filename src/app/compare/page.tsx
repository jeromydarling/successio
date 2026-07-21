"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/marketing/motion-primitives";
import { Button } from "@/components/ui/button";

const LEAD =
  "A broker sees a balance sheet. A private-equity buyer sees a deal to flip. We see what they miss — the relationships, the know-how, the reason customers keep coming back. Here's the usual way to sell a business, next to ours.";

const ROWS = [
  {
    dim: "Knowing what it's worth",
    old: "98% of owners never learn their number — until a buyer walks away from it.",
    neu: "A live Sale Readiness Score, from your first upload.",
  },
  {
    dim: "Capturing how it runs",
    old: "Thirty years of know-how locked in one person's head.",
    neu: "AI pulls SOPs, customers, and equipment from your documents — and your voice.",
  },
  {
    dim: "Finding the right buyer",
    old: "70–80% of businesses listed for sale never find one.",
    neu: "A diligence-ready profile you can share with buyers, employees, co-ops, or lenders.",
  },
  {
    dim: "Time on the market",
    old: "8–10 months on the market — after months of prep.",
    neu: "Ready to share in an afternoon, and documented as you go.",
  },
  {
    dim: "What it costs",
    old: "6–12% broker commission — about $300,000 on a $5M sale.",
    neu: "Free to try, a flat monthly plan, and a capped fee only when a deal closes.",
  },
  {
    dim: "Surviving due diligence",
    old: "~50% of deals collapse in diligence; 1 in 4 over messy books.",
    neu: "Clean, organized records that hold up under scrutiny.",
  },
  {
    dim: "Who ends up owning it",
    old: "Whoever bids highest — often stripped for parts and moved out of town.",
    neu: "A buyer, your crew (co-op or trust), or a local CDFI-backed deal.",
  },
  {
    dim: "What it ends up worth",
    old: "Owner-dependent businesses sell for 30–50% less.",
    neu: "Documented businesses command 20–30% more — up to double the multiple.",
  },
];

const ROI = [
  { stat: "30–50%", label: "the owner-dependence discount you avoid", source: "Bennett Financials" },
  { stat: "20–30%", label: "premium for clean, organized financials", source: "Chinook Business Advisory" },
  { stat: "2×", label: "the multiple gap between owner-dependent and owner-independent", source: "Bennett Financials" },
  { stat: "73%", label: "faster close with real-time, organized reporting", source: "Chinook Business Advisory" },
];

export default function ComparePage() {
  return (
    <main className="relative" id="main-content">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              The old way vs. ours
            </span>
            <h1 className="mt-4 text-balance text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-tight text-ink">
              What it costs to wait.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">{LEAD}</p>
          </Reveal>
        </div>
      </section>

      {/* Comparison */}
      <section className="relative pb-8">
        <div className="mx-auto max-w-5xl px-5">
          {/* Column headers */}
          <div className="sticky top-20 z-20 mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr] md:pl-[34%]">
            <div className="hidden rounded-xl border border-edge bg-canvas/80 px-4 py-2.5 text-center text-sm font-semibold text-ink-soft backdrop-blur md:block">
              Selling the usual way
            </div>
            <div className="hidden rounded-xl border border-amber/30 bg-amber/[0.06] px-4 py-2.5 text-center text-sm font-semibold text-amber-bright backdrop-blur md:block">
              With Successio
            </div>
          </div>

          <StaggerGroup className="space-y-3">
            {ROWS.map((r) => (
              <StaggerItem key={r.dim}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[34%_1fr_1fr] md:items-stretch">
                  <div className="flex items-center text-sm font-semibold text-ink md:text-base">
                    {r.dim}
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-edge bg-canvas-soft/30 p-4">
                    <X className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                    <p className="text-sm leading-relaxed text-ink-soft">{r.old}</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/[0.04] p-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber" />
                    <p className="text-sm leading-relaxed text-ink">{r.neu}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ROI */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              The math of being ready
            </h2>
            <p className="mt-3 text-lg text-ink-soft text-pretty">
              Documentation isn&apos;t paperwork. It&apos;s a measurable difference in
              price, speed, and whether the deal closes at all.
            </p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {ROI.map((r) => (
              <StaggerItem key={r.label}>
                <div className="h-full rounded-2xl border border-edge bg-canvas/40 p-6">
                  <div className="text-3xl font-semibold tracking-tight text-amber-bright md:text-4xl">
                    {r.stat}
                  </div>
                  <p className="mt-2 text-sm leading-snug text-ink-soft">{r.label}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{r.source}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>

          {/* Worked example */}
          <Reveal delay={0.1}>
            <div className="mt-10 rounded-2xl border border-amber/20 bg-amber/[0.04] p-6 md:p-8">
              <p className="text-sm font-medium uppercase tracking-wider text-amber">What that means in dollars</p>
              <p className="mt-3 text-lg leading-relaxed text-ink text-pretty md:text-xl">
                On a $2M business, the gap between selling out of your head and
                selling diligence-ready can be <span className="font-semibold text-amber-bright">$600K–$1M</span> in
                final price — before you count the deals that simply never close.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
              Worth more than the sum of its parts. Let&apos;s prove it.
            </h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start your free trial
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  See pricing
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
