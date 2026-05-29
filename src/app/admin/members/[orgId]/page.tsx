"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText, Flag, CheckCircle2, Circle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

export default function MemberDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { data, isLoading, error } = trpc.admin.memberDetail.useQuery({ orgId });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink-faint" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-center text-ink-soft">Member not found.</div>;
  }

  const { org, scoreHistory, milestones, docs, checklist } = data;
  const latest = scoreHistory.at(-1)?.score ?? null;
  const first = scoreHistory[0]?.score ?? null;
  const lift = latest !== null && first !== null ? latest - first : null;
  const maxScore = Math.max(100, ...scoreHistory.map((s) => s.score));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{org.name}</h1>
          <p className="mt-0.5 text-sm capitalize text-ink-soft">
            {[org.vertical, org.location, org.founded && `est. ${org.founded}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-semibold tracking-tight text-amber-bright">{latest ?? "—"}</div>
          <p className="text-xs text-ink-faint">
            readiness{lift !== null && ` · ${lift >= 0 ? "+" : ""}${lift} lift`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/legacy?orgId=${org.id}`}>
          <Button size="sm" variant="outline"><BookOpen className="size-4" /> Preview Legacy Book</Button>
        </Link>
      </div>

      {/* Score history sparkline */}
      {scoreHistory.length > 1 && (
        <div className="mt-6 rounded-2xl border border-edge bg-canvas-soft/40 p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Readiness over time</p>
          <div className="flex h-24 items-end gap-1">
            {scoreHistory.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-amber-deep to-amber-bright"
                style={{ height: `${(s.score / maxScore) * 100}%` }}
                title={`${s.score}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Checklist / gaps */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Readiness checklist</h2>
          {checklist.length === 0 ? (
            <p className="text-sm text-ink-faint">No checklist items yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5 text-sm">
                  {c.completed
                    ? <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    : <Circle className="size-4 shrink-0 text-ink-faint" />}
                  <span className={cn(c.completed ? "text-ink-soft" : "text-ink-faint")}>{c.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Documents */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Documents ({docs.length})</h2>
          {docs.length === 0 ? (
            <p className="text-sm text-ink-faint">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {docs.slice(0, 12).map((d) => (
                <li key={d.id} className="flex items-center gap-2.5 text-sm text-ink-soft">
                  <FileText className="size-4 shrink-0 text-ink-faint" />
                  <span className="flex-1 truncate">{d.originalName}</span>
                  <span className="text-xs text-ink-faint">{d.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* The LIFE of the member — timeline */}
      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Flag className="size-4 text-amber" /> The story so far
        </h2>
        {milestones.length === 0 ? (
          <p className="text-sm text-ink-faint">No milestones captured yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-edge pl-6">
            {milestones.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-amber" />
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm text-amber-bright">{m.year}</span>
                  <span className="text-sm font-medium text-ink">{m.title}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{m.description}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
