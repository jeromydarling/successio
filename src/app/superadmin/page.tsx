"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

const VERTICAL_LABEL: Record<string, string> = {
  manufacturing: "Manufacturing",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  construction: "Construction",
  trucking: "Trucking",
  agriculture: "Agriculture",
};

function ChurnBadge({ score, labels }: { score: number; labels: string[] }) {
  const color =
    score === 0
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score <= 1
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      : score <= 2
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  const label = score === 0 ? "Healthy" : score === 1 ? "Watch" : score === 2 ? "At risk" : "Critical";
  return (
    <span
      title={labels.join(" · ")}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

function formatDate(ts: number | null) {
  if (!ts) return "Never";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SuperAdminCustomers() {
  const { data, isLoading } = trpc.superadmin.list.useQuery();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "at-risk">("all");

  const filtered = (data ?? []).filter((org) => {
    const matchSearch =
      !search ||
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      (org.location ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "all" || org.churn.score >= 2;
    return matchSearch && matchRisk;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.length ?? 0} organizations
          </p>
        </div>
        <Link
          href="/superadmin/map"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          View map →
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value as "all" | "at-risk")}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All customers</option>
          <option value="at-risk">At-risk only</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center">No customers match.</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left font-medium text-slate-500 px-4 py-3">Business</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Vertical</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Location</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Score</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Last login</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  onClick={() => window.location.href = `/superadmin/orgs/${org.id}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {org.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {VERTICAL_LABEL[org.vertical] ?? org.vertical}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                    {org.location ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100">
                    {org.latestScore !== null ? `${org.latestScore}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {formatDate(org.lastLogin)}
                  </td>
                  <td className="px-4 py-3">
                    <ChurnBadge score={org.churn.score} labels={org.churn.labels} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
