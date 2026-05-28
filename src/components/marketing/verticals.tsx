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

const VERTICALS = [
  { icon: Factory, label: "Machine Shops", partners: "NTMA · PMPA" },
  { icon: Wind, label: "HVAC", partners: "ACCA" },
  { icon: Wrench, label: "Plumbing", partners: "PHCC" },
  { icon: Zap, label: "Electrical", partners: "IEC · NECA" },
  { icon: HardHat, label: "Construction", partners: "AGC" },
  { icon: Truck, label: "Trucking", partners: "ATA" },
  { icon: Tractor, label: "Agriculture", partners: "AFBF" },
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
              <div className="font-mono text-[11px] text-ink-faint">{v.partners}</div>
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
            Each trade gets its own document types, extraction prompts, readiness
            checklist and association network — distributed through the groups
            your members already trust.
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
