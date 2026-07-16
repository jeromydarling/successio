/**
 * Individual help article — server component, statically renderable.
 * Sidebar lists every article grouped by category; body renders the
 * markdown subset via src/lib/help/markdown.tsx.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HELP_ARTICLES, getArticle, articlesByCategory } from "@/lib/help/articles";
import { renderMarkdown } from "@/lib/help/markdown";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const idx = HELP_ARTICLES.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? HELP_ARTICLES[idx - 1] : null;
  const next = idx < HELP_ARTICLES.length - 1 ? HELP_ARTICLES[idx + 1] : null;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-28 space-y-7">
              <Link
                href="/help"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="size-3.5" /> All articles
              </Link>
              {articlesByCategory().map(({ category, articles }) => (
                <div key={category}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    {category}
                  </p>
                  <ul className="space-y-1">
                    {articles.map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={`/help/${a.slug}`}
                          className={cn(
                            "block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug transition-colors",
                            a.slug === slug
                              ? "bg-amber/10 font-medium text-amber-bright"
                              : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                          )}
                        >
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          {/* Article */}
          <article className="min-w-0 max-w-2xl flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">
              {article.category}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">{article.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{article.summary}</p>
            <hr className="my-8 border-edge" />
            <div>{renderMarkdown(article.body)}</div>

            {/* Prev / next */}
            <div className="mt-14 grid gap-3 border-t border-edge pt-8 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`/help/${prev.slug}`}
                  className="group rounded-xl border border-edge p-4 transition-colors hover:border-amber/30"
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-faint">Previous</span>
                  <span className="mt-1 block text-sm font-medium text-ink group-hover:text-amber-bright">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/help/${next.slug}`}
                  className="group rounded-xl border border-edge p-4 text-right transition-colors hover:border-amber/30"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-ink-faint">
                    Next <ChevronRight className="size-3" />
                  </span>
                  <span className="mt-1 block text-sm font-medium text-ink group-hover:text-amber-bright">
                    {next.title}
                  </span>
                </Link>
              )}
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
