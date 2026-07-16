"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  TrendingUp,
  Users,
  Wrench,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Circle,
  BarChart3,
} from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { Icon: React.ElementType; color: string }> = {
  customers:  { Icon: Users,         color: "text-sky-400" },
  financials: { Icon: BarChart3,     color: "text-emerald-400" },
  operations: { Icon: ClipboardList, color: "text-amber" },
  equipment:  { Icon: Wrench,        color: "text-orange-400" },
  people:     { Icon: Users,         color: "text-violet-400" },
  compliance: { Icon: ShieldCheck,   color: "text-pink-400" },
};

export default function DashboardPage() {
  const utils = trpc.useUtils();

  // Real-time updates via SSE from the org's Durable Object. Polling at a slow
  // 30s cadence remains as a fallback if the stream is unavailable.
  const { data: score, dataUpdatedAt } = trpc.businesses.latestScore.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: checklist = [] } = trpc.businesses.checklist.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: docPage } = trpc.documents.list.useQuery({ limit: 5 });
  const docs = docPage?.items;
  const { data: org } = trpc.businesses.getOrg.useQuery();

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    const es = new EventSource("/api/processing-stream");
    es.onmessage = () => {
      // A document finished processing — refresh the live views.
      utils.businesses.latestScore.invalidate();
      utils.businesses.checklist.invalidate();
      utils.documents.list.invalidate();
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [utils]);

  const pct = score?.score ?? 0;
  const breakdown: Record<string, number> = score?.breakdown
    ? JSON.parse(score.breakdown as string)
    : {};

  // Group checklist by category
  const grouped = checklist.reduce<Record<string, typeof checklist>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <AppTopNav title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* New-account onboarding — self-hides once every step is done */}
          <GettingStarted />

          {/* Readiness score hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl border border-edge bg-canvas-soft/60 p-7"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-amber/[0.04] to-transparent" />
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <GaugeMeter value={pct} />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-ink">
                  {org?.name ?? "Your Business"}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {org?.vertical ?? "—"} · Sale Readiness Score
                </p>
                {pct === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    Upload your first document to start building your score.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ink-soft">
                    Your business is{" "}
                    <span className="font-semibold text-amber-bright">{pct}% ready</span>{" "}
                    for a sale process. Keep uploading to improve your score.
                  </p>
                )}
                <div className="mt-4">
                  <Link href="/upload">
                    <Button size="sm">
                      <Upload className="size-4" /> Upload documents
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Two-column: category bars + checklist */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Category breakdown */}
            {Object.keys(breakdown).length > 0 && (
              <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-ink">Score breakdown</h3>
                {Object.entries(breakdown).map(([cat, val]) => {
                  const { Icon, color } = CATEGORY_META[cat] ?? { Icon: ClipboardList, color: "text-ink-soft" };
                  return (
                    <div key={cat}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className={cn("flex items-center gap-1.5 font-medium capitalize", color)}>
                          <Icon className="size-3.5" /> {cat}
                        </span>
                        <span className="font-mono text-ink-faint">{val}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber to-amber-bright"
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Readiness checklist */}
            <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">Readiness checklist</h3>
              {checklist.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Checklist populates as you upload documents.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, items]) => {
                    const { Icon, color } = CATEGORY_META[category] ?? { Icon: ClipboardList, color: "text-ink-soft" };
                    return (
                      <div key={category}>
                        <div className={cn("mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", color)}>
                          <Icon className="size-3" /> {category}
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          <AnimatePresence>
                            {items.map((item) => (
                              <motion.li
                                key={item.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-xs"
                              >
                                {item.completed ? (
                                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                                ) : (
                                  <Circle className="size-3.5 shrink-0 text-ink-faint" />
                                )}
                                <span className={item.completed ? "text-ink" : "text-ink-soft"}>
                                  {item.label}
                                </span>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent documents */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Recent uploads</h3>
              <Link href="/vault" className="flex items-center gap-1 text-xs text-amber hover:text-amber-bright">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            {docs && docs.length > 0 ? (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-edge bg-canvas-soft/40 px-4 py-3"
                  >
                    <span className="truncate text-sm text-ink">{doc.originalName}</span>
                    <StatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyUpload />
            )}
          </section>

          {/* What to upload next */}
          <UploadNextSuggestions />
        </div>
      </main>
    </>
  );
}

function GaugeMeter({ value }: { value: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ * 0.75;

  return (
    <div className="relative flex size-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="size-full -rotate-[135deg]">
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25 + circ}`}
        />
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ * 0.75 }}
          animate={{ strokeDashoffset: circ * 0.75 - dash }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-semibold text-amber-bright tabular-nums">{value}</span>
        <span className="text-[10px] uppercase tracking-widest text-ink-faint">/ 100</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued:       { label: "Queued",     cls: "bg-white/5 text-ink-faint" },
    ocr:          { label: "OCR",        cls: "bg-sky-500/10 text-sky-400" },
    extracting:   { label: "Extracting", cls: "bg-amber/10 text-amber" },
    embedding:    { label: "Embedding",  cls: "bg-violet-500/10 text-violet-400" },
    complete:     { label: "Done",       cls: "bg-emerald-500/10 text-emerald-400" },
    failed:       { label: "Failed",     cls: "bg-red-500/10 text-red-400" },
    needs_review: { label: "Review",     cls: "bg-orange-500/10 text-orange-400" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-white/5 text-ink-faint" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}

function EmptyUpload() {
  return (
    <div className="rounded-xl border border-dashed border-edge py-10 text-center">
      <Upload className="mx-auto size-8 text-ink-faint" />
      <p className="mt-3 text-sm text-ink-soft">No documents yet</p>
      <Link href="/upload">
        <Button size="sm" variant="outline" className="mt-3">
          Upload your first document
        </Button>
      </Link>
    </div>
  );
}

const SUGGESTIONS = [
  { icon: TrendingUp,   title: "3 years of P&L statements",          why: "Financials are 25% of your score — the single biggest lever." },
  { icon: Users,        title: "Customer list with revenue breakdown", why: "Buyers need to see concentration risk and contract status." },
  { icon: ClipboardList,title: "Your core SOPs or work order template",why: "Shows the business can run without you." },
];

function UploadNextSuggestions() {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-ink">What to upload next</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <Link href="/upload" key={s.title}>
            <div className="group rounded-xl border border-edge bg-canvas-soft/40 p-4 transition-colors hover:border-edge-strong">
              <s.icon className="size-5 text-amber" />
              <p className="mt-2 text-sm font-medium text-ink">{s.title}</p>
              <p className="mt-1 text-xs text-ink-soft">{s.why}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
