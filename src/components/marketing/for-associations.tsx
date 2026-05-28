"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Reveal } from "./motion-primitives";
import { Button } from "@/components/ui/button";

export function ForAssociations() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-edge bg-canvas-soft/50 p-8 md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-amber/[0.08] blur-[100px]" />
            <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge bg-white/[0.03] px-3 py-1 text-xs text-ink-soft">
                  <Building2 className="size-3.5 text-amber" />
                  For associations, foundations &amp; alliances
                </div>
                <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                  The owners are yours. The wave is hitting your rolls first.
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty">
                  Offer succession readiness as a member benefit under your own
                  brand. See readiness across your whole membership, feed
                  diligence-ready deals to your lending partners, and keep the
                  businesses your trade is made of whole and local.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link href="/partners" className="w-full lg:w-auto">
                  <Button size="lg" className="group w-full lg:w-auto">
                    The partner pitch
                    <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/contact?plan=partner" className="w-full lg:w-auto">
                  <Button size="lg" variant="outline" className="w-full lg:w-auto">
                    Talk to us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
