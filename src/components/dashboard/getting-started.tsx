"use client";

/**
 * Getting-started checklist for new accounts — replaces the "empty dashboard"
 * moment with five guided steps. Every step's completion is derived from real
 * data (via businesses.onboardingStatus); nothing is ticked by hand. The card
 * disappears on its own once all steps are done, or when dismissed.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Upload,
  Table2,
  Mic,
  Share2,
  CheckCircle2,
  ArrowRight,
  X,
  BookOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "successio:getting-started-dismissed";

interface Step {
  key: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  icon: React.ElementType;
  done: boolean;
}

export function GettingStarted() {
  const { data: status } = trpc.businesses.onboardingStatus.useQuery();
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we check

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!status || dismissed) return null;

  const steps: Step[] = [
    {
      key: "details",
      title: "Tell us about the business",
      detail: "Location, year founded, size — two minutes, anchors everything.",
      href: "/settings",
      cta: "Open Settings",
      icon: Building2,
      done: status.detailsComplete,
    },
    {
      key: "upload",
      title: "Upload your first documents",
      detail: "A customer list, last year's P&L, an equipment list — or photograph paper with your phone.",
      href: "/upload",
      cta: "Upload",
      icon: Upload,
      done: status.hasDocuments,
    },
    {
      key: "data",
      title: "Check what the AI found",
      detail: "Review the extracted customers, equipment and financials — fix or add anything by hand.",
      href: "/data",
      cta: "Business Data",
      icon: Table2,
      done: status.hasBusinessData,
    },
    {
      key: "sop",
      title: "Record what's in your head",
      detail: "Answer one interview question out loud — it becomes a written procedure.",
      href: "/knowledge",
      cta: "Record",
      icon: Mic,
      done: status.hasSop,
    },
    {
      key: "profile",
      title: "Generate your buyer profile",
      detail: "Unlocks at a readiness score of 30 — then share it on your terms.",
      href: "/profile",
      cta: "Deal Room",
      icon: Share2,
      done: status.hasProfile,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  // The first incomplete step is the highlighted "do this next".
  const nextKey = steps.find((s) => !s.done)?.key;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative overflow-hidden rounded-2xl border border-amber/25 bg-gradient-to-br from-amber/[0.07] to-transparent p-6"
      >
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss getting started"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-10">
          <h2 className="text-base font-semibold text-ink">
            {doneCount === 0 ? "Welcome — let's build your business record" : "Keep going — you're making progress"}
          </h2>
          <span className="font-mono text-xs text-amber">
            {doneCount}/{steps.length} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-amber"
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / steps.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <ul className="mt-5 space-y-2.5">
          {steps.map((step) => {
            const isNext = step.key === nextKey;
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  step.done
                    ? "border-transparent opacity-60"
                    : isNext
                    ? "border-amber/30 bg-amber/[0.06]"
                    : "border-edge/60"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                ) : (
                  <step.icon className={cn("size-5 shrink-0", isNext ? "text-amber" : "text-ink-faint")} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", step.done ? "text-ink-soft line-through decoration-ink-faint/40" : "text-ink")}>
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{step.detail}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      isNext
                        ? "bg-amber text-slate-900 hover:bg-amber-bright"
                        : "border border-edge text-ink-soft hover:border-edge-strong hover:text-ink"
                    )}
                  >
                    {step.cta} <ArrowRight className="size-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <BookOpen className="size-3.5" />
          New here? The{" "}
          <Link href="/help/getting-started" className="text-amber underline underline-offset-2 hover:text-amber-bright">
            first-30-minutes guide
          </Link>{" "}
          walks through all of this.
        </p>
      </motion.section>
    </AnimatePresence>
  );
}
