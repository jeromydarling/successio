"use client";

/**
 * Concierge queue — every done-for-you request, worked in place: status,
 * assignee, kickoff date, and internal notes. New requests land at the top.
 */

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import {
  CONCIERGE_STATUSES,
  CONCIERGE_STATUS_META,
  CONCIERGE_TIMELINES,
  type ConciergeStatus,
  type ConciergeTimeline,
} from "@/lib/concierge";

const TONE: Record<string, string> = {
  neutral: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  active: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  off: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ConciergeQueue() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.superadmin.conciergeList.useQuery();
  const update = trpc.superadmin.conciergeUpdate.useMutation({
    onSuccess: () => utils.superadmin.conciergeList.invalidate(),
  });
  const remove = trpc.superadmin.conciergeDelete.useMutation({
    onSuccess: () => utils.superadmin.conciergeList.invalidate(),
  });
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [editing, setEditing] = useState<string | null>(null);

  const rows = (data ?? []).filter((r) =>
    filter === "all" ? true : !["delivered", "declined"].includes(r.status)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Concierge requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} {filter === "open" ? "open" : "total"} · new requests need a reply within one business day
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-sm capitalize ${
                filter === f
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {update.error && <p className="mt-3 text-sm text-red-600">{update.error.message}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Records · timeline</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignee · kickoff</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No requests.</td></tr>
            )}
            {rows.map((r) => {
              const meta = CONCIERGE_STATUS_META[r.status as ConciergeStatus];
              const records = [r.hasPaper && "paper", r.hasDigital && "digital", r.hasQuickbooks && "QuickBooks"]
                .filter(Boolean)
                .join(", ") || "—";
              const isEditing = editing === r.id;
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{r.businessName}</div>
                    <div className="text-xs text-slate-500">
                      {r.vertical}{r.location ? ` · ${r.location}` : ""}
                      {r.orgId && (
                        <>
                          {" · "}
                          <Link href={`/superadmin/orgs/${r.orgId}`} className="text-blue-600 hover:underline">account</Link>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900 dark:text-slate-100">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                      {r.phone ? ` · ${r.phone}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                    <div>{records}</div>
                    <div>{CONCIERGE_TIMELINES[r.timeline as ConciergeTimeline] ?? r.timeline}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) => update.mutate({ id: r.id, status: e.target.value as ConciergeStatus })}
                      className={`rounded-full px-2 py-1 text-xs font-medium ${TONE[meta?.tone ?? "neutral"]}`}
                      aria-label="Status"
                    >
                      {CONCIERGE_STATUSES.map((s) => (
                        <option key={s} value={s}>{CONCIERGE_STATUS_META[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <EditCell
                        assignee={r.assignee ?? ""}
                        scheduledFor={r.scheduledFor ?? ""}
                        notes={r.internalNotes ?? ""}
                        onSave={(v) => {
                          update.mutate({ id: r.id, assignee: v.assignee || null, scheduledFor: v.scheduledFor || null, internalNotes: v.notes || null });
                          setEditing(null);
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <button type="button" onClick={() => setEditing(r.id)} className="text-left text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                        <div>{r.assignee || <span className="text-slate-400">unassigned</span>}</div>
                        <div>{r.scheduledFor || <span className="text-slate-400">no kickoff yet</span>}</div>
                        {r.internalNotes && <div className="mt-1 max-w-[220px] truncate text-slate-500" title={r.internalNotes}>{r.internalNotes}</div>}
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-blue-600">edit</div>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { if (confirm("Delete this request permanently?")) remove.mutate({ id: r.id }); }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data && data.some((r) => r.notes) && (
        <p className="mt-3 text-xs text-slate-500">Requester notes appear in the team email and on hover in the queue.</p>
      )}
    </div>
  );
}

function EditCell({
  assignee, scheduledFor, notes, onSave, onCancel,
}: {
  assignee: string; scheduledFor: string; notes: string;
  onSave: (v: { assignee: string; scheduledFor: string; notes: string }) => void;
  onCancel: () => void;
}) {
  const [a, setA] = useState(assignee);
  const [s, setS] = useState(scheduledFor);
  const [n, setN] = useState(notes);
  return (
    <div className="space-y-1.5">
      <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Assignee" className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
      <input value={s} onChange={(e) => setS(e.target.value)} placeholder="Kickoff (e.g. Tue Sep 16, 10am ET)" className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
      <textarea value={n} onChange={(e) => setN(e.target.value)} placeholder="Internal notes" rows={2} className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800" />
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave({ assignee: a, scheduledFor: s, notes: n })} className="rounded bg-slate-900 px-2 py-1 text-xs text-white dark:bg-slate-100 dark:text-slate-900">Save</button>
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs text-slate-500">Cancel</button>
      </div>
    </div>
  );
}
