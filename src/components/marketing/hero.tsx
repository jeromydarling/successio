"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion-primitives";

const HEADLINE = ["Your", "life's", "work,"];
const HEADLINE_2 = ["passed", "on", "—", "not", "sold", "off."];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Cursor-tracked glow
  const gx = useMotionValue(50);
  const gy = useMotionValue(30);
  const sgx = useSpring(gx, { stiffness: 60, damping: 20 });
  const sgy = useSpring(gy, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      gx.set((e.clientX / window.innerWidth) * 100);
      gy.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [gx, gy]);

  const glowBg = useTransform(
    [sgx, sgy],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}% ${y}%, rgba(245,158,11,0.12), transparent 60%)`
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20"
    >
      {/* Parallax grid + glow */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade"
      />
      <motion.div
        style={{ background: glowBg }}
        className="pointer-events-none absolute inset-0 -z-10"
      />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-amber/[0.07] blur-[120px]" />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div style={{ opacity: fade }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-edge bg-white/[0.03] px-3.5 py-1.5 text-xs text-ink-soft"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber" />
            </span>
            A $5 trillion handoff is here — and most owners have no plan
          </motion.div>

          <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[0.98] tracking-tight text-ink">
            <span className="block">
              {HEADLINE.map((w, i) => (
                <Word key={w} word={w} delay={0.15 + i * 0.08} />
              ))}
            </span>
            <span className="mt-1 block text-ink-soft">
              {HEADLINE_2.map((w, i) => (
                <Word
                  key={w}
                  word={w}
                  delay={0.4 + i * 0.08}
                  highlight={w === "passed"}
                />
              ))}
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft text-pretty"
          >
            You spent decades building this — the customers who trust you, the
            crew who knows the work, the things that only live in your head.
            Successio gets it down on paper and passes it on whole: to a buyer,
            your employees, or a local deal that keeps it rooted where it belongs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Magnetic strength={0.45}>
              <Link href="/signup">
                <Button size="lg" className="group">
                  Start your profile
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
            </Magnetic>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                See a live business
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <ProcessingPanel />
      </div>
    </section>
  );
}

function Word({
  word,
  delay,
  highlight,
}: {
  word: string;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <span className="mr-[0.25em] inline-block align-bottom">
      <motion.span
        initial={{ y: "55%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        className={highlight ? "relative inline-block text-amber-bright" : "inline-block"}
      >
        {word}
        {highlight && (
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: delay + 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-amber/60"
          />
        )}
      </motion.span>
    </span>
  );
}

/* A looping mock of the extraction pipeline — gives the hero live movement. */
const STEPS = [
  { label: "job-traveler-4471.pdf", state: "OCR" },
  { label: "customer-list-2024.xlsx", state: "Extracting" },
  { label: "Carl-interview.m4a", state: "Transcribing" },
  { label: "equipment-ledger.pdf", state: "Done" },
];

function ProcessingPanel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ perspective: 1000 }}
    >
      <div className="float-slow rounded-2xl border border-edge bg-canvas-soft/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-edge pb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Sparkles className="size-4 text-amber" />
            Live extraction
          </div>
          <span className="font-mono text-xs text-ink-faint">org_brenner</span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {STEPS.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active || s.state === "Done";
            return (
              <li
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-edge bg-white/[0.02] px-3 py-2.5"
              >
                <FileText
                  className={`size-4 shrink-0 ${
                    isActive ? "text-amber" : "text-ink-faint"
                  }`}
                />
                <span className="flex-1 truncate font-mono text-xs text-ink-soft">
                  {s.label}
                </span>
                <motion.span
                  animate={{ opacity: isActive ? [0.5, 1, 0.5] : 1 }}
                  transition={{ duration: 1.4, repeat: isActive ? Infinity : 0 }}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isDone
                      ? "bg-emerald-500/15 text-emerald-400"
                      : isActive
                        ? "bg-amber/15 text-amber"
                        : "bg-white/5 text-ink-faint"
                  }`}
                >
                  {isDone ? "Done" : s.state}
                </motion.span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber/[0.06] px-3 py-3">
          <span className="text-xs text-ink-soft">Sale Readiness</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber to-amber-bright"
                animate={{ width: ["44%", "71%", "44%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <span className="font-mono text-sm font-semibold text-amber-bright">71</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
