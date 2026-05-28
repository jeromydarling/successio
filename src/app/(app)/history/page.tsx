"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Sparkles, X } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { OrgTimeline } from "@/components/timeline/org-timeline";
import { RevenueSparkline } from "@/components/timeline/revenue-sparkline";
import { CATEGORY_META } from "@/components/timeline/timeline-meta";
import type { MilestoneCategory, OrgMilestone } from "@/lib/demo-history";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const FILTERS: (MilestoneCategory | "all")[] = [
  "all", "founding", "financial", "equipment", "people",
  "customer", "operations", "compliance", "milestone",
];

const CATEGORIES: MilestoneCategory[] = [
  "founding", "financial", "equipment", "people",
  "customer", "operations", "compliance", "milestone",
];

const emptyForm = {
  year: new Date().getFullYear(),
  category: "milestone" as MilestoneCategory,
  title: "",
  description: "",
  metricLabel: "",
  metricValue: "",
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<MilestoneCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.history.timeline.useQuery();

  const createMutation = trpc.history.create.useMutation({
    onSuccess: () => {
      utils.history.timeline.invalidate();
      setForm(emptyForm);
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => utils.history.timeline.invalidate(),
  });

  const milestones = useMemo<OrgMilestone[]>(() => {
    const all = (data?.milestones ?? []) as OrgMilestone[];
    return filter === "all" ? all : all.filter((m) => m.category === filter);
  }, [data, filter]);

  const submit = () => {
    if (!form.title || !form.description) return;
    createMutation.mutate({
      year: Number(form.year),
      category: form.category,
      title: form.title,
      description: form.description,
      metricLabel: form.metricLabel || undefined,
      metricValue: form.metricValue || undefined,
    });
  };

  return (
    <>
      <AppTopNav title="History" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
                Life of the business
              </span>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {data?.org.name ?? "Your business timeline"}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {[data?.org.vertical, data?.org.location, data?.org.founded && `est. ${data.org.founded}`]
                  .filter(Boolean)
                  .join(" · ") || "The story a buyer walks through during diligence."}
              </p>
            </div>
            <Button onClick={() => setShowForm((s) => !s)} size="sm">
              {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
              {showForm ? "Cancel" : "Add milestone"}
            </Button>
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-5 rounded-2xl border border-edge bg-canvas-soft/40 p-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-ink-faint">Year</label>
                      <input
                        type="number"
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ink-faint">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as MilestoneCategory })}
                        className="input-base capitalize"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-ink-faint">Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Landed the Goodyear tooling contract"
                        className="input-base"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-ink-faint">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={3}
                        placeholder="What happened, and why it matters to a buyer."
                        className="input-base resize-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ink-faint">Metric label (optional)</label>
                      <input
                        value={form.metricLabel}
                        onChange={(e) => setForm({ ...form, metricLabel: e.target.value })}
                        placeholder="Anchor revenue"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ink-faint">Metric value (optional)</label>
                      <input
                        value={form.metricValue}
                        onChange={(e) => setForm({ ...form, metricValue: e.target.value })}
                        placeholder="32% of book"
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={submit} disabled={!form.title || !form.description || createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Add to timeline
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Revenue sparkline */}
          {data && data.revenueByYear.length > 1 && (
            <div className="mt-8 rounded-2xl border border-edge bg-canvas-soft/40 p-6">
              <RevenueSparkline data={data.revenueByYear} />
            </div>
          )}

          {/* Loading / empty */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-6 animate-spin text-ink-faint" />
            </div>
          ) : (data?.milestones.length ?? 0) === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-edge bg-canvas-soft/20 py-16 text-center">
              <Sparkles className="mx-auto size-7 text-amber" />
              <p className="mt-3 text-sm font-medium text-ink">No milestones yet</p>
              <p className="mt-1 text-sm text-ink-faint">
                Upload documents to extract history automatically, or add milestones by hand.
              </p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mt-10 flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                  const active = filter === f;
                  const meta = f === "all" ? null : CATEGORY_META[f];
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-all",
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
                      <p className="py-16 text-center text-ink-faint">
                        No milestones in this category.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Manage list */}
              <div className="mt-14">
                <h3 className="text-sm font-semibold text-ink">Manage milestones</h3>
                <ul className="mt-3 divide-y divide-edge rounded-xl border border-edge">
                  {(data?.milestones ?? []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">
                          <span className="font-mono text-ink-faint">{m.year}</span> · {m.title}
                        </p>
                        <span className="text-xs text-ink-faint capitalize">
                          {CATEGORY_META[m.category as MilestoneCategory]?.label ?? m.category}
                          {" · "}
                          {(m as { isManual?: boolean }).isManual ? "manual" : "extracted"}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: m.id })}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete milestone"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
