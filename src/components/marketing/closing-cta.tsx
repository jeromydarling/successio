"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic, Reveal } from "./motion-primitives";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-32">
      <div className="absolute inset-0 -z-10 bg-grid bg-grid-fade opacity-40" />
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.1] blur-[120px]"
      />

      <div className="mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
            Your life&apos;s work deserves
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-amber-bright">a proper handoff.</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-amber/20" />
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft text-pretty">
            Start with a single document. Watch the readiness score move. Decide
            who sees the rest. No spreadsheets, no consultants, no jargon.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Magnetic strength={0.5}>
              <Button size="lg" className="group">
                Start your profile — free
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </Magnetic>
            <Button size="lg" variant="ghost">
              Talk to a succession advisor
            </Button>
          </div>
          <p className="mt-5 font-mono text-xs text-ink-faint">
            Built on Cloudflare · Your documents never train a public model
          </p>
        </Reveal>
      </div>
    </section>
  );
}
