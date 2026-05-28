"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DEMO_ORG } from "@/lib/demo-history";
import { OrgTimeline } from "@/components/timeline/org-timeline";
import { RevenueSparkline } from "@/components/timeline/revenue-sparkline";
import { Button } from "@/components/ui/button";
import { Reveal } from "./motion-primitives";

export function TimelineShowcase() {
  return (
    <section id="timeline" className="relative py-28">
      <div className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber/[0.05] blur-[140px]" />

      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              The story a buyer pays for
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
              Every business has a life. We make it legible.
            </h2>
            <p className="mt-4 text-pretty text-ink-soft">
              Acquirers don&apos;t buy a pile of assets — they buy a story they
              believe will keep running. Successio reconstructs that story from
              your records into a timeline an investor can walk in five minutes.
            </p>
          </Reveal>
        </div>

        {/* Header card: the org + its revenue arc */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-edge bg-canvas-soft/60 p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
                  Demo organization
                </div>
                <h3 className="mt-1 text-2xl font-semibold text-ink">
                  {DEMO_ORG.name}
                </h3>
                <p className="text-sm text-ink-soft">
                  {DEMO_ORG.vertical} · {DEMO_ORG.location} · est. {DEMO_ORG.founded}
                </p>
              </div>
              <div className="flex gap-6">
                <Stat label="Years" value={`${new Date().getFullYear() - DEMO_ORG.founded}`} />
                <Stat label="People" value={`${DEMO_ORG.employees}`} />
              </div>
            </div>
            <div className="mt-6 border-t border-edge pt-6">
              <RevenueSparkline data={DEMO_ORG.revenueByYear} />
            </div>
          </div>
        </Reveal>

        {/* The timeline itself */}
        <div className="mt-16">
          <OrgTimeline milestones={DEMO_ORG.milestones} />
        </div>

        <Reveal>
          <div className="mt-14 flex justify-center">
            <Link href="/history">
              <Button variant="outline" size="lg" className="group">
                Open the full interactive demo
                <ArrowUpRight className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-semibold text-amber-bright tabular-nums">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  );
}
