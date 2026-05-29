"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Loader2, Users, TrendingUp, FileText, AlertTriangle,
  ArrowRight, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { data: mine, isLoading } = trpc.admin.mine.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (!mine?.association) return <Onboarding />;
  return <Dashboard associationName={mine.association.name} />;
}

/* ───────────────────────── Onboarding ───────────────────────── */

function Onboarding() {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  const createMutation = trpc.admin.create.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      utils.admin.mine.invalidate();
    },
  });

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-8">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/25">
          <Building2 className="size-5 text-amber" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          Set up your association
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Create your association to import members, track readiness across your
          membership, and run a charter pilot under your own brand.
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-ink-faint">Association name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="National Tooling & Machining Association"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-faint">Website (optional)</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.ntma.org"
              className="input-base"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate({ name, website: website || undefined })}
            disabled={name.length < 2 || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
            Create association
          </Button>
          {createMutation.error && (
            <p className="text-xs text-red-400">{createMutation.error.message}</p>
          )}
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

function Dashboard({ associationName }: { associationName: string }) {
  const { data: overview } = trpc.admin.overview.useQuery();
  const { data: members = [] } = trpc.admin.members.useQuery();
  const { data: report } = trpc.admin.report.useQuery();

  const stats = [
    { label: "Members", value: String(overview?.memberCount ?? 0), sub: `${overview?.pendingInvites ?? 0} invites pending`, Icon: Users },
    { label: "Avg readiness", value: String(overview?.avgScore ?? 0), sub: "across the membership", Icon: TrendingUp },
    { label: "Readiness lift", value: `${(overview?.lift ?? 0) >= 0 ? "+" : ""}${overview?.lift ?? 0}`, sub: "since first snapshot", Icon: TrendingUp },
    { label: "Docs (30d)", value: String(overview?.recentDocs ?? 0), sub: "processed this month", Icon: FileText },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{associationName}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Membership readiness overview</p>
        </div>
        <Link href="/admin/members">
          <Button size="sm"><Upload className="size-4" /> Import members</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
            <s.Icon className="size-4 text-amber" />
            <div className="mt-3 text-3xl font-semibold tracking-tight text-ink">{s.value}</div>
            <p className="mt-1 text-xs text-ink-faint">{s.label} · {s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roster */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink">Member roster</h2>
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge bg-canvas-soft/20 py-12 text-center">
              <p className="text-sm text-ink-soft">No members yet.</p>
              <Link href="/admin/members" className="mt-2 inline-flex items-center gap-1.5 text-sm text-amber-bright">
                Import your roster <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-edge rounded-2xl border border-edge">
              {members.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/members/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs capitalize text-ink-faint">{m.vertical} · {m.docCount} docs</p>
                    </div>
                    <ScorePill score={m.latestScore} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* At-risk + distribution */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="size-4 text-amber" /> Needs attention
            </h2>
            {report && report.atRisk.length > 0 ? (
              <ul className="space-y-2">
                {report.atRisk.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/members/${r.id}`} className="flex items-center justify-between rounded-xl border border-edge bg-canvas-soft/40 px-3 py-2 text-sm transition-colors hover:bg-white/[0.02]">
                      <span className="truncate text-ink-soft">{r.name}</span>
                      <ScorePill score={r.score} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">No at-risk members.</p>
            )}
          </div>

          {report && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-ink">Readiness distribution</h2>
              <div className="space-y-2">
                {Object.entries(report.distribution).map(([bucket, n]) => {
                  const pct = report.total ? (n / report.total) * 100 : 0;
                  return (
                    <div key={bucket} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 font-mono text-[11px] text-ink-faint">{bucket}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber to-amber-bright" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-5 shrink-0 text-right text-xs text-ink-soft">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-ink-faint">no score</span>;
  const cls = score >= 70 ? "bg-emerald-500/15 text-emerald-400" : score >= 40 ? "bg-amber/15 text-amber" : "bg-red-500/15 text-red-400";
  return <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold", cls)}>{score}</span>;
}
