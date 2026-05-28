"use client";

import { motion } from "framer-motion";
import { Upload, ScanText, BadgeCheck } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./motion-primitives";

const STEPS = [
  {
    n: "01",
    icon: Upload,
    title: "Empty the filing cabinet",
    body: "Snap a photo of a work order, forward an email, drag in a folder, or just talk. Paper, scans, spreadsheets, voicemails — it all goes in.",
  },
  {
    n: "02",
    icon: ScanText,
    title: "We read it like a buyer would",
    body: "OCR and AI pull out customers, equipment, processes and financials — every field scored for confidence, so nothing is taken on faith.",
  },
  {
    n: "03",
    icon: BadgeCheck,
    title: "Hand over a story, not a shoebox",
    body: "Out comes a Sale Readiness Score, a documented operation, and a deal room you can share with buyers, lenders and co-ops on your terms.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-ink md:text-5xl">
            Three steps from a cluttered office to a sale-ready business.
          </h2>
        </Reveal>

        <StaggerGroup className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3" gap={0.12}>
          {STEPS.map((s) => (
            <StaggerItem key={s.n}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="group relative h-full overflow-hidden rounded-2xl border border-edge bg-canvas-soft/50 p-7"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-amber/[0.06] blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/20">
                    <s.icon className="size-5 text-amber" />
                  </span>
                  <span className="font-mono text-4xl font-semibold text-white/[0.06]">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </motion.article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
