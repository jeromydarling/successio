"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OrgMilestone } from "@/lib/demo-history";
import { CATEGORY_META } from "./timeline-meta";

interface OrgTimelineProps {
  milestones: OrgMilestone[];
}

/**
 * The "Life of the Business" timeline. A vertical rail whose progress line
 * fills as the reader scrolls, with category-coded nodes and alternating
 * cards (desktop) that reveal on entry. This is the artifact a buyer walks
 * through to understand what 38 years actually built.
 */
export function OrgTimeline({ milestones }: OrgTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.6"],
  });
  const lineScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl">
      {/* The rail. On mobile it hugs the left; on desktop it's centered. */}
      <div className="absolute left-5 top-2 bottom-2 w-px bg-edge md:left-1/2 md:-translate-x-1/2" />
      <motion.div
        className="absolute left-5 top-2 w-px origin-top bg-gradient-to-b from-amber-bright via-amber to-amber-deep md:left-1/2 md:-translate-x-1/2"
        style={{ scaleY: lineScale, height: "calc(100% - 16px)" }}
      />

      <ul className="space-y-10 md:space-y-2">
        {milestones.map((m, i) => (
          <TimelineRow key={m.id} milestone={m} index={i} />
        ))}
      </ul>
    </div>
  );
}

function TimelineRow({
  milestone,
  index,
}: {
  milestone: OrgMilestone;
  index: number;
}) {
  const meta = CATEGORY_META[milestone.category];
  const Icon = meta.icon;
  const onLeft = index % 2 === 0;

  return (
    <li className="relative">
      <div
        className={cn(
          "md:grid md:grid-cols-2 md:gap-12",
          // Place the card on alternating sides on desktop.
          onLeft ? "" : "md:[&>*:first-child]:col-start-2"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative ml-14 md:ml-0",
            onLeft ? "md:text-right md:pr-2" : "md:pl-2"
          )}
        >
          <article className="group rounded-2xl border border-edge bg-canvas-soft/70 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-edge-strong">
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em]",
                onLeft ? "md:justify-end" : "",
                meta.text
              )}
            >
              <Icon className="size-3.5" />
              {meta.label}
            </div>

            <div
              className={cn(
                "mt-2 flex items-baseline gap-3",
                onLeft ? "md:flex-row-reverse" : ""
              )}
            >
              <span className="font-mono text-2xl font-semibold text-ink tabular-nums">
                {milestone.period ?? milestone.year}
              </span>
              {milestone.period && (
                <span className="font-mono text-xs text-ink-faint">
                  {milestone.year}
                </span>
              )}
            </div>

            <h3 className="mt-1 text-lg font-semibold text-ink text-balance">
              {milestone.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft text-pretty">
              {milestone.description}
            </p>

            <div
              className={cn(
                "mt-4 flex flex-wrap items-center gap-2",
                onLeft ? "md:justify-end" : ""
              )}
            >
              {milestone.metric && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `rgba(${meta.rgb},0.1)`,
                    color: `rgb(${meta.rgb})`,
                  }}
                >
                  <span className="opacity-70">{milestone.metric.label}</span>
                  <span className="font-mono font-semibold">
                    {milestone.metric.value}
                  </span>
                </span>
              )}
              {milestone.source && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-[11px] text-ink-faint">
                  <span className="size-1 rounded-full bg-emerald-400" />
                  {milestone.source}
                </span>
              )}
            </div>
          </article>
        </motion.div>
      </div>

      {/* Node on the rail */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-5 top-1 z-10 -translate-x-1/2 md:left-1/2"
      >
        <span
          className="flex size-9 items-center justify-center rounded-full border bg-canvas"
          style={{
            borderColor: `rgba(${meta.rgb},0.5)`,
            boxShadow: `0 0 0 4px #0a0c10, 0 0 20px rgba(${meta.rgb},0.35)`,
          }}
        >
          <Icon className="size-4" style={{ color: `rgb(${meta.rgb})` }} />
        </span>
      </motion.div>
    </li>
  );
}
