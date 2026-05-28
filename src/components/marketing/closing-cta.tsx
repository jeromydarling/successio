"use client";

import Link from "next/link";
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
            You&apos;ve done the hard part.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-amber-bright">Don&apos;t let it end in an auction.</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-amber/20" />
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft text-pretty">
            Forty years of work shouldn&apos;t be liquidated in a weekend to a
            stranger who strips it for parts. Get it down on paper, show the next
            owner what they&apos;re really getting, and put it in hands that will
            keep the doors open.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Magnetic strength={0.5}>
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start your free trial
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
            </Magnetic>
            <Link href="/compare">
              <Button size="lg" variant="ghost">
                See what waiting costs
              </Button>
            </Link>
          </div>
          <p className="mt-5 font-mono text-xs text-ink-faint">
            14-day free trial · You keep ownership of everything · We only win when you do
          </p>
        </Reveal>
      </div>
    </section>
  );
}
