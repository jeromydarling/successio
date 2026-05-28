"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, Users, MapPin, Heart, Hammer } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Verticals } from "@/components/marketing/verticals";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/marketing/motion-primitives";
import { Button } from "@/components/ui/button";

const LEAD =
  "Over the next ten years, millions of owners will retire with no plan in place. Too many of those businesses will quietly close, or get flipped and gutted by someone who was never going to stay. We think there's a better ending. The people who built a business — the ones who know how it really runs — deserve a fair shot at carrying it forward. We're here to make that handoff possible.";

const COST = [
  {
    stat: "80%",
    label: "of net worth",
    body: "For most owners, four-fifths of everything they have is locked inside one business — and it only converts to retirement if the handoff works.",
    source: "Exit Planning Institute",
  },
  {
    stat: "13,260",
    label: "jobs a year",
    body: "In New York State alone, an estimated 3,700 businesses close each year because an owner retired without a buyer. That's the cost in one state.",
    source: "Project Equity",
  },
  {
    stat: "75%",
    label: "regret it",
    body: "Three in four owners regret the sale within a year — most often because no one helped them prepare for it or what came after.",
    source: "Exit Planning Institute",
  },
];

const PRINCIPLES = [
  {
    icon: Hammer,
    title: "The dignity of the person who built it",
    body: "You spent thirty years on this — the late nights, the payroll you always made, the work that carries your name. It deserves to be understood, not just appraised.",
  },
  {
    icon: Users,
    title: "The people come before the money",
    body: "A business is its crew, its customers, its know-how — not a line on a balance sheet. The people who run it should have a real shot at owning it, not just whoever bids highest.",
  },
  {
    icon: MapPin,
    title: "Keep it whole, keep it local",
    body: "A shop rooted in your town should be able to stay rooted in your town. When a business is kept whole instead of stripped for parts, the jobs and the Main Street stay too.",
  },
  {
    icon: Heart,
    title: "A business is a community asset",
    body: "When a shop closes, a town loses more than a building. It loses jobs, suppliers, a place that mattered. A good handoff keeps that community intact.",
  },
];

const PATHS = [
  { title: "Your employees", body: "A worker co-op or an employee ownership trust lets the people who run it own it. Employee-owned firms are about half as likely to close over a decade." },
  { title: "A local buyer", body: "A CDFI- or SBA-backed buyer can keep the business in town. SBA 7(a) financing covers acquisitions up to $5M — but only for a business that's documented and ready." },
  { title: "An operator who'll stay", body: "A search-fund operator buys one business to run it, not flip it. There's a growing pool of them looking for exactly the kind of business you built." },
];

export default function WhyPage() {
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
              Why we exist
            </span>
            <h1 className="mt-4 text-balance text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-tight text-ink">
              A business is a community, not a commodity.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft text-pretty">
              {LEAD}
            </p>
          </Reveal>
        </div>
      </section>

      {/* The default ending */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 text-xs text-ink-soft">
              <TrendingDown className="size-3.5 text-amber" />
              The default ending is a bad one
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              When there's no plan, a lifetime of work is liquidated for pennies.
            </h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {COST.map((c) => (
              <StaggerItem key={c.label}>
                <div className="h-full rounded-2xl border border-edge bg-canvas/40 p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-semibold tracking-tight text-amber-bright">{c.stat}</span>
                    <span className="text-sm text-ink-soft">{c.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{c.source}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Principles */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              What we believe
            </h2>
            <p className="mt-3 text-lg text-ink-soft text-pretty">
              Not a mission statement. The few things that decide every call we make.
            </p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
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

      {/* The better ending */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              No kid to take over? You still have good options.
            </h2>
            <p className="mt-3 text-lg text-ink-soft text-pretty">
              Every one of them keeps the business alive and the jobs in town — and every one needs the same thing: a documented, diligence-ready business.
            </p>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PATHS.map((p) => (
              <StaggerItem key={p.title}>
                <div className="h-full rounded-2xl border border-edge bg-canvas/40 p-6">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <Verticals />

      {/* CTA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
              Your trade. Your terms. Your legacy.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft text-pretty">
              Start with what&apos;s in your head. We&apos;ll help with the rest.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start your free trial
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/compare">
                <Button size="lg" variant="outline">
                  See what waiting costs
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
