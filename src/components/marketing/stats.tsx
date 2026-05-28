"use client";

import { AnimatedCounter, Reveal } from "./motion-primitives";

const STATS = [
  { value: 5, prefix: "$", suffix: "T", decimals: 0, label: "of family-owned businesses change hands this decade", source: "McKinsey, 2026" },
  { value: 80, suffix: "%", decimals: 0, label: "of businesses listed for sale never find a buyer", source: "Exit Planning Institute" },
  { value: 98, suffix: "%", decimals: 0, label: "of owners have never learned what their life's work is worth", source: "M&T Bank" },
  { value: 50, suffix: "%", decimals: 0, label: "of deals that reach the table collapse in due diligence", source: "DueDilio, 2026" },
];

export function Stats() {
  return (
    <section className="relative border-y border-edge bg-canvas-soft/40 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              <AnimatedCounter
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                decimals={s.decimals}
                className="text-amber-bright"
              />
            </div>
            <p className="mt-2 text-sm leading-snug text-ink-soft">{s.label}</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{s.source}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
