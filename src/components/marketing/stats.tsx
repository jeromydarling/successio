"use client";

import { AnimatedCounter, Reveal } from "./motion-primitives";

const STATS = [
  { value: 2.8, suffix: "M", decimals: 1, label: "U.S. business owners over 55 with no succession plan" },
  { value: 70, suffix: "%", decimals: 0, label: "of owners who try to sell never find a buyer" },
  { value: 38, suffix: " yrs", decimals: 0, label: "of know-how locked in a typical founder's head" },
  { value: 6.2, prefix: "$", suffix: "M", decimals: 1, label: "median value a documented trades business commands" },
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
          </Reveal>
        ))}
      </div>
    </section>
  );
}
