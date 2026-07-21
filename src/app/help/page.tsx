"use client";

/**
 * Help Center index — the user-facing wiki. Searchable, grouped by category.
 * Article content lives in src/lib/help/articles.ts.
 */

import { useState } from "react";
import Link from "next/link";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HELP_ARTICLES, articlesByCategory } from "@/lib/help/articles";

export default function HelpIndexPage() {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q
    ? HELP_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q)
      )
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32" id="main-content">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">Help Center</p>
          <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
            How everything works
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Detailed, plain-spoken guides to every feature — from photographing your first
            document to sharing a finished profile with a buyer.
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mt-8 max-w-lg">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the help center…"
            className="input-base pl-11 py-3"
          />
        </div>

        {/* Search results */}
        {matches !== null ? (
          <div className="mt-10 space-y-3">
            <p className="text-xs text-ink-faint">
              {matches.length} article{matches.length === 1 ? "" : "s"} match
            </p>
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-edge py-14 text-center">
                <BookOpen className="mx-auto size-8 text-ink-faint" />
                <p className="mt-3 text-sm text-ink-soft">
                  Nothing matched — try a different word, or{" "}
                  <Link href="/contact" className="text-amber underline underline-offset-2">
                    ask us directly
                  </Link>
                  .
                </p>
              </div>
            ) : (
              matches.map((a) => <ArticleCard key={a.slug} slug={a.slug} title={a.title} summary={a.summary} category={a.category} />)
            )}
          </div>
        ) : (
          /* Category groups */
          <div className="mt-12 space-y-12">
            {articlesByCategory().map(({ category, articles }) => (
              <section key={category}>
                <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                  {category}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {articles.map((a) => (
                    <ArticleCard key={a.slug} slug={a.slug} title={a.title} summary={a.summary} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ArticleCard({ slug, title, summary, category }: { slug: string; title: string; summary: string; category?: string }) {
  return (
    <Link
      href={`/help/${slug}`}
      className="group flex flex-col rounded-2xl border border-edge bg-canvas-soft/40 p-5 transition-colors hover:border-amber/30 hover:bg-canvas-soft/60"
    >
      {category && (
        <span className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">{category}</span>
      )}
      <span className="text-sm font-semibold text-ink">{title}</span>
      <span className="mt-1.5 flex-1 text-xs leading-relaxed text-ink-soft">{summary}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber opacity-0 transition-opacity group-hover:opacity-100">
        Read <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}
