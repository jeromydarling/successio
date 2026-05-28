"use client";

import Link from "next/link";
import {
  ArrowRight, Building2, LayoutDashboard, ShieldCheck,
  HandHeart, Landmark, Users2,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/marketing/motion-primitives";
import { Button } from "@/components/ui/button";

const LEAD =
  "The owners retiring out of your membership built the businesses your trade is made of. When one closes for lack of a buyer, your association loses a member, the trade loses capacity, and a town loses jobs. You are the institution these owners already trust — which makes you the one who can actually get them ready in time.";

const STAKES = [
  {
    stat: "60%",
    label: "of manufacturers are owned by someone 55+",
    source: "American Machinist",
  },
  {
    stat: "125,000",
    label: "Boomer-owned manufacturers employing ~2.6M workers",
    source: "The Century Foundation",
  },
  {
    stat: "1 in 4",
    label: "skilled tradespeople expected to retire by 2030",
    source: "PTT / Birm Group",
  },
];

const MEMBER_VALUE = [
  {
    icon: ShieldCheck,
    title: "A member benefit that actually matters",
    body: "Most member benefits are discounts. This is the difference between a member's life's work transferring or disappearing. It's a reason to join, and a reason to stay.",
  },
  {
    icon: HandHeart,
    title: "Meet members where they already are",
    body: "Owners won't list on a marketplace they've never heard of. They will act when the association they've trusted for decades puts a tool in front of them under your name.",
  },
];

const PARTNER_VALUE = [
  {
    icon: LayoutDashboard,
    title: "Aggregate readiness dashboard",
    body: "See succession readiness across your whole membership — who's prepared, who's at risk, and where to focus member outreach before it's too late.",
  },
  {
    icon: Building2,
    title: "Your brand, your instance",
    body: "A white-labeled platform under your association's name and colors. Unlimited member seats, every vertical configured, dedicated onboarding and support.",
  },
  {
    icon: Landmark,
    title: "Deal flow for your lending partners",
    body: "Diligence-ready businesses with clean lender packages — exactly what CDFIs, SBA lenders, and foundation capital need to finance local acquisitions and co-op conversions.",
  },
  {
    icon: Users2,
    title: "Mission outcomes you can report",
    body: "Jobs kept in the region, businesses kept whole and local, ownership broadened to employees. Measurable impact for your board, your funders, and your members.",
  },
];

const PARTNERS = [
  "NTMA", "PMPA", "PHCC", "ACCA", "AGC", "IEC", "NECA", "ATA", "AFBF",
  "MEP Centers", "CDFIs", "Urban Manufacturing Alliances", "Foundations",
];

export default function PartnersPage() {
  return (
    <main className="relative">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-amber/[0.06] blur-[120px]" />
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              For associations, foundations &amp; alliances
            </span>
            <h1 className="mt-4 text-balance text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-tight text-ink">
              Your members built these businesses. Help them pass them on.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">{LEAD}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/contact?plan=partner">
                <Button size="lg" className="group">
                  Become a partner
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  See partner pricing
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The stakes for membership */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              The succession crisis is a membership crisis.
            </h2>
            <p className="mt-3 text-lg text-ink-soft text-pretty">
              The wave is hitting your rolls first — the founders and family owners who have been members the longest.
            </p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {STAKES.map((s) => (
              <StaggerItem key={s.label}>
                <div className="h-full rounded-2xl border border-edge bg-canvas/40 p-6">
                  <div className="text-4xl font-semibold tracking-tight text-amber-bright">{s.stat}</div>
                  <p className="mt-2 text-sm leading-snug text-ink-soft">{s.label}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{s.source}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* What members get */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-amber">For your members</span>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              The one institution they&apos;ll actually trust with this
            </h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {MEMBER_VALUE.map((p) => (
              <StaggerItem key={p.title}>
                <div className="flex h-full gap-4 rounded-2xl border border-edge bg-canvas-soft/40 p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/25">
                    <p.icon className="size-5 text-amber" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* What you get */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-amber">For your organization</span>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Distribution, visibility, and impact you can measure
            </h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {PARTNER_VALUE.map((p) => (
              <StaggerItem key={p.title}>
                <div className="flex h-full gap-4 rounded-2xl border border-edge bg-canvas/40 p-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/25">
                    <p.icon className="size-5 text-amber" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Who we partner with */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <p className="text-sm uppercase tracking-widest text-ink-faint">
              Built for the organizations doing this work
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {PARTNERS.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-edge bg-canvas-soft/40 px-3.5 py-1.5 text-sm text-ink-soft"
                >
                  {p}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
              Bring it to the people who built your trade.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft text-pretty">
              We&apos;ll stand up a white-labeled instance under your brand, train your team, and price it to your membership.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact?plan=partner">
                <Button size="lg" className="group">
                  Become a partner
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  See partner pricing
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
