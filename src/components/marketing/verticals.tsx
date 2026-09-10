"use client";

import {
  Factory,
  Wind,
  Wrench,
  Zap,
  HardHat,
  Truck,
  Tractor,
} from "lucide-react";
import { Reveal } from "./motion-primitives";

// Each trade shows the document types the AI actually understands for it —
// a real product capability, never an implied association endorsement.
const VERTICALS = [
  { icon: Factory, label: "Machine Shops", docs: "job travelers · work orders · QC records" },
  { icon: Wind, label: "HVAC", docs: "service tickets · maintenance contracts" },
  { icon: Wrench, label: "Plumbing", docs: "work orders · permits · service agreements" },
  { icon: Zap, label: "Electrical", docs: "job estimates · permits · inspection reports" },
  { icon: HardHat, label: "Construction", docs: "bids · contracts · lien waivers" },
  { icon: Truck, label: "Trucking", docs: "load sheets · DOT records · maintenance logs" },
  { icon: Tractor, label: "Agriculture", docs: "leases · crop records · equipment lists" },
];

function Row({ reverse }: { reverse?: boolean }) {
  const items = [...VERTICALS, ...VERTICALS];
  return (
    <div className="flex w-max gap-4">
      <div
        className={`flex gap-4 ${reverse ? "marquee-slow" : "marquee"}`}
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {items.map((v, i) => (
          <div
            key={`${v.label}-${i}`}
            className="flex shrink-0 items-center gap-3 rounded-2xl border border-edge bg-canvas-soft/50 px-5 py-4"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-edge">
              <v.icon className="size-5 text-amber" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">{v.label}</div>
              <div className="font-mono text-[11px] text-ink-faint">{v.docs}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Verticals() {
  return (
    <section id="verticals" className="relative overflow-hidden py-24">
      <div className="mx-auto mb-12 max-w-6xl px-5">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            Built for the trades
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
            Not generic SaaS. It knows what a job traveler is.
          </h2>
          <p className="mt-4 max-w-xl text-ink-soft">
            Each trade gets its own document types, extraction prompts, and
            readiness checklist — so the AI reads your paperwork the way someone
            in your business would.
          </p>
        </Reveal>
      </div>

      {/* Edge fade mask over the moving rows */}
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-canvas to-transparent" />
        <div className="space-y-4">
          <Row />
          <Row reverse />
        </div>
      </div>
    </section>
  );
}
