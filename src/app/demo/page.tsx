"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2 } from "lucide-react";
import { DEMO_ORG, type MilestoneCategory } from "@/lib/demo-history";
import { OrgTimeline } from "@/components/timeline/org-timeline";
import { RevenueSparkline } from "@/components/timeline/revenue-sparkline";
import { CATEGORY_META } from "@/components/timeline/timeline-meta";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS: (MilestoneCategory | "all")[] = [
  "all",
  "founding",
  "financial",
  "equipment",
  "people",
  "customer",
  "operations",
  "compliance",
  "milestone",
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<MilestoneCategory | "all">("all");

  const milestones = useMemo(
    () =>
      filter === "all"
        ? DEMO_ORG.milestones
        : DEMO_ORG.milestones.filter((m) => m.category === filter),
    [filter]
  );

  return (
    <main className="relative min-h-screen pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-grid bg-grid-fade" />

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-edge bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <span className="font-mono text-xs text-ink-faint">
            share/token/teaser
          </span>
          <Button size="sm" variant="outline">
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5">
        {/* Org header */}
        <header className="pt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              Life of the business
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-6xl">
              {DEMO_ORG.name}
            </h1>
            <p className="mt-3 text-lg text-ink-soft">
              {DEMO_ORG.vertical} · {DEMO_ORG.location} · {DEMO_ORG.employees}{" "}
              people · established {DEMO_ORG.founded}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 rounded-2xl border border-edge bg-canvas-soft/60 p-6 md:p-8"
          >
            <RevenueSparkline data={DEMO_ORG.revenueByYear} />
          </motion.div>
        </header>

        {/* Filters */}
        <div className="sticky top-[57px] z-30 -mx-5 mt-12 bg-canvas/60 px-5 py-4 backdrop-blur-md">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f;
              const meta = f === "all" ? null : CATEGORY_META[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-all duration-200",
                    active
                      ? "border-amber/40 bg-amber/15 text-amber-bright"
                      : "border-edge text-ink-soft hover:border-edge-strong hover:text-ink"
                  )}
                >
                  {meta ? meta.label : "All milestones"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {milestones.length > 0 ? (
                <OrgTimeline milestones={milestones} />
              ) : (
                <p className="py-20 text-center text-ink-faint">
                  No milestones in this category yet.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
