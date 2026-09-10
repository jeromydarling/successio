"use client";

/**
 * Listing detail — the teaser sections and size bands, then a single door:
 * "Request full access" → the NDA-gated share page, where the buyer
 * identifies themselves and verifies their email before anything
 * confidential is released.
 */

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, MapPin, Users, BarChart3, ShieldCheck, Calendar } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { trpc } from "@/lib/trpc-client";
import { VERTICAL_LABELS } from "@/lib/marketplace";

const SECTION_LABELS: Record<string, string> = {
  executive_summary: "Executive summary",
  business_overview: "Business overview",
  opportunity: "The opportunity",
};

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = trpc.marketplace.get.useQuery({ id });

  return (
    <main className="relative" id="main-content">
      <SiteNav />
      <section className="relative pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-5">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="size-3.5" /> All listings
          </Link>

          {isLoading && <p className="mt-8 text-sm text-ink-faint">Loading…</p>}
          {error && <p className="mt-8 text-sm text-red-400">This listing isn&apos;t available.</p>}

          {data && (
            <>
              <span className="mt-8 block font-mono text-xs uppercase tracking-[0.2em] text-amber">
                {VERTICAL_LABELS[data.vertical] ?? data.vertical}
              </span>
              <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight text-ink md:text-4xl">
                {data.headline}
              </h1>

              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: MapPin, label: "Region", value: data.region },
                  { icon: BarChart3, label: "Revenue", value: data.revenueBand },
                  { icon: Users, label: "Team", value: data.employeeBand },
                  { icon: data.founded ? Calendar : ShieldCheck, label: data.founded ? "Founded" : "Records", value: data.founded ? String(data.founded) : data.readinessBand },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl border border-edge bg-canvas-soft/40 p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-faint">
                      <f.icon className="size-3.5" /> {f.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-xs text-ink-soft">
                <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
                <span><span className="font-medium text-ink">{data.readinessBand}.</span> Records extracted and a buyer profile audited against the owner&apos;s actual documents.</span>
              </div>

              <div className="mt-10 space-y-8">
                {Object.entries(data.teaser).map(([key, text]) => (
                  <section key={key}>
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                      {SECTION_LABELS[key] ?? key.replace(/_/g, " ")}
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{text}</p>
                  </section>
                ))}
              </div>

              <div className="mt-12 rounded-2xl border border-amber/30 bg-amber/[0.05] p-6">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 size-5 shrink-0 text-amber" />
                  <div>
                    <h2 className="text-base font-semibold text-ink">Customers, financials, operations, team, and equipment</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      The full profile is released only after you identify yourself, verify your email,
                      and accept a confidentiality agreement. The owner sees who viewed what.
                    </p>
                    <Link
                      href={`/share/${data.shareTokenId}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-bright"
                    >
                      Request full access <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
