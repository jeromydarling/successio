"use client";

/**
 * Buyer browse — blind listings only. No names, no exact figures. Every card
 * leads to a detail page whose "Request access" goes through the NDA gate.
 */

import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Users, BarChart3, ShieldCheck, Search } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { trpc } from "@/lib/trpc-client";
import { VERTICAL_LABELS, REVENUE_BANDS } from "@/lib/marketplace";

export default function MarketplacePage() {
  const [vertical, setVertical] = useState("");
  const [region, setRegion] = useState("");
  const [revenueBand, setRevenueBand] = useState("");
  const { data, isLoading } = trpc.marketplace.list.useQuery({
    vertical: vertical || undefined,
    region: region || undefined,
    revenueBand: revenueBand || undefined,
  });

  return (
    <main className="relative" id="main-content">
      <SiteNav />
      <section className="relative overflow-hidden pt-32 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="mx-auto max-w-6xl px-5">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Marketplace</span>
          <h1 className="mt-3 text-balance text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            Businesses for sale, documented before they&apos;re listed.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft text-pretty">
            Every business here has been through Successio: records extracted, know-how written
            down, a buyer profile audited against the actual numbers. Listings are blind — request
            access and identify yourself to see the full profile.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-5">
          {/* Filters */}
          <div className="grid gap-3 rounded-2xl border border-edge bg-canvas-soft/40 p-4 sm:grid-cols-3">
            <label className="text-xs text-ink-soft">
              Trade
              <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="input-base mt-1">
                <option value="">All trades</option>
                {Object.entries(VERTICAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-soft">
              Region
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ohio, Texas…" className="input-base pl-9" />
              </div>
            </label>
            <label className="text-xs text-ink-soft">
              Annual revenue
              <select value={revenueBand} onChange={(e) => setRevenueBand(e.target.value)} className="input-base mt-1">
                <option value="">Any size</option>
                {REVENUE_BANDS.filter((b) => b !== "Undisclosed").map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Results */}
          <div className="mt-8">
            {isLoading && <p className="text-sm text-ink-faint">Loading listings…</p>}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-dashed border-edge py-16 text-center">
                <Building2 className="mx-auto size-8 text-ink-faint" />
                <p className="mt-3 text-sm text-ink-soft">No listings match yet. Check back — new businesses are added as owners finish documenting.</p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.map((l) => (
                <Link
                  key={l.id}
                  href={`/marketplace/${l.id}`}
                  className="group flex flex-col rounded-2xl border border-edge bg-canvas-soft/40 p-5 transition-colors hover:border-amber/40 hover:bg-canvas-soft/60"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
                    {VERTICAL_LABELS[l.vertical] ?? l.vertical}
                  </span>
                  <h2 className="mt-2 text-base font-semibold leading-snug text-ink">{l.headline}</h2>
                  <dl className="mt-4 space-y-1.5 text-xs text-ink-soft">
                    <div className="flex items-center gap-2"><MapPin className="size-3.5 text-ink-faint" /> {l.region}</div>
                    <div className="flex items-center gap-2"><BarChart3 className="size-3.5 text-ink-faint" /> {l.revenueBand} revenue</div>
                    <div className="flex items-center gap-2"><Users className="size-3.5 text-ink-faint" /> {l.employeeBand}</div>
                    <div className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-emerald-400" /> {l.readinessBand}</div>
                  </dl>
                  <span className="mt-4 text-xs font-medium text-amber opacity-0 transition-opacity group-hover:opacity-100">
                    View teaser →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
