"use client";

import Link from "next/link";
import { HeartHandshake, Scale, Tag, ArrowRight } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";

const CARDS = [
  {
    href: "/why",
    icon: HeartHandshake,
    eyebrow: "Why it matters",
    title: "A business is a community, not a commodity",
    body: "The people who built it should have a fair shot at carrying it forward. Here's the case for a real handoff.",
  },
  {
    href: "/compare",
    icon: Scale,
    eyebrow: "The old way vs. ours",
    title: "What it costs to wait",
    body: "Brokers, valuations, months on the market, and a one-in-two chance the deal dies. See the difference, side by side.",
  },
  {
    href: "/pricing",
    icon: Tag,
    eyebrow: "Pricing",
    title: "We only win when you do",
    body: "A fair plan for every stage of the handoff — and a capped platform fee charged only when a deal actually closes.",
  },
];

export function PathCards() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mb-12 max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Three ways to understand what we do
          </h2>
          <p className="mt-3 text-lg text-ink-soft text-pretty">
            Start wherever you are — the case for it, the cost of waiting, or
            what it takes to begin.
          </p>
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <StaggerItem key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border border-edge bg-canvas-soft/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-edge-strong hover:bg-canvas-soft/70"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/25">
                  <c.icon className="size-5 text-amber" />
                </span>
                <p className="mt-5 font-mono text-xs uppercase tracking-widest text-amber">
                  {c.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">
                  {c.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {c.body}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-amber-bright">
                  Read more
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
