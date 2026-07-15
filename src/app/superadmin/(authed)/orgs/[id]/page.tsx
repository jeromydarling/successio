"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

function ScoreSparkline({ scores }: { scores: Array<{ score: number; createdAt: Date | string | null }> }) {
  if (scores.length === 0) return <span className="text-slate-400 text-sm">No score yet</span>;
  const vals = [...scores].reverse().map((s) => s.score);
  const max = 100;
  const h = 40;
  const w = Math.max(vals.length * 12, 80);
  const pts = vals
    .map((v, i) => `${(i / (vals.length - 1 || 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  const latest = vals[vals.length - 1];
  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          points={pts}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{latest}</span>
      <span className="text-sm text-slate-500">/100</span>
    </div>
  );
}

function formatDate(d: Date | string | number | null) {
  if (!d) return "—";
  const date = typeof d === "number" ? new Date(d * 1000) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const { data, isLoading, refetch } = trpc.superadmin.orgDetail.useQuery({ orgId: id });
  const createNote = trpc.superadmin.createNote.useMutation({ onSuccess: () => { refetch(); setNoteContent(""); } });
  const deleteNote = trpc.superadmin.deleteNote.useMutation({ onSuccess: () => refetch() });

  if (isLoading) {
    return <div className="text-sm text-slate-500 py-12 text-center">Loading…</div>;
  }
  if (!data) {
    return <div className="text-sm text-red-500 py-12 text-center">Organization not found.</div>;
  }

  const { org, scores, documents, notes, users } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/superadmin" className="text-sm text-slate-500 hover:text-slate-700">
          ← All customers
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          {org.name}
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          {org.vertical} · {org.location ?? "Location not set"} · Since {org.founded ?? "?"}
        </p>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Employees", org.employeeCount ?? "—"],
            ["Annual revenue", org.annualRevenue ? `$${(org.annualRevenue / 1_000_000).toFixed(1)}M` : "—"],
            ["Documents", documents.length],
            ["Users", users.length],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
        {org.description && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            {org.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readiness score */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
            Readiness Score
          </h2>
          <ScoreSparkline scores={scores} />
          {scores.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Last updated {formatDate(scores[0].createdAt)} · {scores.length} snapshots
            </p>
          )}
        </div>

        {/* Team */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
            Team
          </h2>
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-900 dark:text-slate-100">{u.name}</span>
                <span className="text-slate-500">{u.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
          Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left font-medium text-slate-500 py-2">Name</th>
                  <th className="text-left font-medium text-slate-500 py-2 hidden sm:table-cell">Type</th>
                  <th className="text-left font-medium text-slate-500 py-2">Status</th>
                  <th className="text-left font-medium text-slate-500 py-2 hidden md:table-cell">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="py-2 text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                      {doc.originalName}
                    </td>
                    <td className="py-2 text-slate-500 hidden sm:table-cell">{doc.fileType ?? "—"}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          doc.status === "complete"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : doc.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : doc.status === "needs_review"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 hidden md:table-cell">
                      {formatDate(doc.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRM Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
          CRM Notes ({notes.length})
        </h2>

        {/* Add note form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (noteContent.trim() && author.trim()) {
              createNote.mutate({ orgId: id, content: noteContent, author });
            }
          }}
          className="mb-6 space-y-3"
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <textarea
            placeholder="Add a note about this customer…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={3}
            required
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <button
            type="submit"
            disabled={!noteContent.trim() || !author.trim() || createNote.isPending}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors"
          >
            {createNote.isPending ? "Saving…" : "Add note"}
          </button>
        </form>

        {/* Notes list */}
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400">No notes yet. Add the first one above.</p>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="border-l-2 border-amber-200 dark:border-amber-800 pl-4"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {note.author}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(note.createdAt)}</span>
                  <button
                    onClick={() => deleteNote.mutate({ noteId: note.id })}
                    className="text-xs text-slate-400 hover:text-red-500 ml-auto"
                    aria-label="Delete note"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
