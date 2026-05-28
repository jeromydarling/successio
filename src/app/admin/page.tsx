"use client";

import { motion } from "framer-motion";
import {
  Building2, Users, FileText, TrendingUp, BarChart3, Wrench, Truck, Wheat,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import { formatUsdCompact } from "@/lib/utils";

const VERTICAL_ICONS: Record<string, React.ElementType> = {
  manufacturing: Wrench,
  hvac:          TrendingUp,
  plumbing:      Wrench,
  electrical:    TrendingUp,
  construction:  Building2,
  trucking:      Truck,
  agriculture:   Wheat,
};

export default function AdminPage() {
  const { data: overview, isLoading: overviewLoading } = trpc.admin.overview.useQuery();
  const { data: orgs = [], isLoading: orgsLoading } = trpc.admin.listOrgs.useQuery({ limit: 100 });
  const { data: distribution } = trpc.admin.scoreDistribution.useQuery();
  const { data: verticals } = trpc.admin.verticalBreakdown.useQuery();

  const stats = [
    { label: "Member businesses", value: overview?.orgCount ?? "—", icon: Building2, color: "text-amber" },
    { label: "Total users",       value: overview?.userCount ?? "—", icon: Users,    color: "text-sky-400" },
    { label: "Documents uploaded",value: overview?.docCount ?? "—",  icon: FileText, color: "text-violet-400" },
    { label: "Avg readiness score",value: overview?.avgScore != null ? `${overview.avgScore}` : "—", icon: BarChart3, color: "text-emerald-400" },
  ];

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-ink">Association Portal</h1>
          <p className="mt-1 text-sm text-ink-soft">Aggregate metrics across all member businesses</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-edge bg-canvas-soft/50 p-5"
            >
              <s.icon className={cn("size-6", s.color)} />
              <p className="mt-3 font-mono text-3xl font-semibold text-ink tabular-nums">
                {overviewLoading ? "—" : String(s.value)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Two-column: verticals + score distribution */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Vertical breakdown */}
          {verticals && (
            <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">Businesses by vertical</h3>
              <div className="space-y-3">
                {Object.entries(verticals).sort(([, a], [, b]) => b - a).map(([v, n]) => {
                  const Icon = VERTICAL_ICONS[v] ?? Building2;
                  const max = Math.max(...Object.values(verticals));
                  return (
                    <div key={v} className="flex items-center gap-3">
                      <Icon className="size-4 shrink-0 text-amber/70" />
                      <span className="w-28 shrink-0 text-xs capitalize text-ink-soft">{v}</span>
                      <div className="flex-1 overflow-hidden">
                        <motion.div
                          className="h-1.5 rounded-full bg-amber/40"
                          initial={{ width: 0 }}
                          animate={{ width: `${(n / max) * 100}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="font-mono text-xs text-ink-faint">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score distribution */}
          {distribution && (
            <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">Score distribution</h3>
              <div className="space-y-3">
                {Object.entries(distribution).map(([range, n]) => {
                  const max = Math.max(...Object.values(distribution), 1);
                  const pct = Math.round((n / max) * 100);
                  const isHigh = range.startsWith("8") || range.startsWith("6");
                  const isMid = range.startsWith("4");
                  return (
                    <div key={range} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 font-mono text-xs text-ink-faint">{range}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className={cn(
                            "h-1.5 rounded-full",
                            isHigh ? "bg-emerald-400" : isMid ? "bg-amber" : "bg-red-400/70"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="font-mono text-xs text-ink-faint">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Member org table */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Member businesses</h3>
          <div className="overflow-hidden rounded-xl border border-edge">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge bg-canvas-soft/30">
                  <th className="px-4 py-3 text-left font-medium text-ink-faint">Business</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-faint">Vertical</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-faint">Location</th>
                  <th className="px-4 py-3 text-right font-medium text-ink-faint">Docs</th>
                  <th className="px-4 py-3 text-right font-medium text-ink-faint">Score</th>
                </tr>
              </thead>
              <tbody>
                {orgsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge/50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 animate-pulse rounded bg-white/[0.04]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orgs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-faint">
                      No member businesses yet
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => (
                    <tr key={org.id} className="border-b border-edge/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-ink">{org.name}</td>
                      <td className="px-4 py-3 capitalize text-ink-soft">{org.vertical}</td>
                      <td className="px-4 py-3 text-ink-soft">{org.location ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-ink-faint">{org.docCount}</td>
                      <td className="px-4 py-3 text-right">
                        {org.latestScore != null ? (
                          <ScoreChip score={org.latestScore} />
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const cls = score >= 70
    ? "bg-emerald-500/10 text-emerald-400"
    : score >= 40
    ? "bg-amber/10 text-amber"
    : "bg-red-500/10 text-red-400";
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-medium", cls)}>
      {score}
    </span>
  );
}
