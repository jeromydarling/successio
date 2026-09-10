"use client";

/**
 * Marketplace inventory — the only place listings and business names appear
 * together. Links to the (hidden) public marketplace, which superadmins can
 * preview while the flag is off.
 */

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { VERTICAL_LABELS } from "@/lib/marketplace";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MarketplaceInventory() {
  const { data, isLoading } = trpc.superadmin.marketplaceList.useQuery();
  const live = (data ?? []).filter((l) => l.status === "live").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Marketplace inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {live} live · {(data?.length ?? 0) - live} paused · hidden from the public until MARKETPLACE_ENABLED is on
          </p>
        </div>
        <a
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Preview public marketplace ↗
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3">Business (private)</th>
              <th className="px-4 py-3">Public headline</th>
              <th className="px-4 py-3">Trade · region</th>
              <th className="px-4 py-3">Revenue · records</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No listings yet. Owners opt in from their Deal Room.</td></tr>
            )}
            {data?.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <Link href={`/superadmin/orgs/${l.orgId}`} className="font-medium text-blue-600 hover:underline">
                    {l.orgName ?? l.orgId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  <Link href={`/marketplace/${l.id}`} target="_blank" className="hover:underline">{l.headline}</Link>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                  {VERTICAL_LABELS[l.vertical] ?? l.vertical} · {l.region}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{l.revenueBand} · {l.readinessBand}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    l.status === "live"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmt(l.publishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
