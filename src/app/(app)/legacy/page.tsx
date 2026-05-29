"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";

export default function LegacyPage() {
  return (
    <Suspense fallback={null}>
      <LegacyInner />
    </Suspense>
  );
}

function LegacyInner() {
  const orgId = useSearchParams().get("orgId") ?? undefined;
  const generate = trpc.legacy.generate.useMutation();
  const book = generate.data?.book;

  return (
    <>
      <AppTopNav title="Legacy Book" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {/* Intro */}
          {!book && (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber/10 ring-1 ring-amber/30">
                <BookOpen className="size-6 text-amber" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
                The story of your business
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-ink-soft text-pretty">
                Everything you&apos;ve documented — the founding, the people, the craft,
                the milestones — composed into a keepsake book. A life&apos;s work, written
                down. Preview it here; order the hardcover when you&apos;re ready.
              </p>
              <div className="mt-8">
                <Button size="lg" onClick={() => generate.mutate(orgId ? { orgId } : undefined)} disabled={generate.isPending}>
                  {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {generate.isPending ? "Composing the story…" : "Compose the book"}
                </Button>
              </div>
              {generate.error && (
                <p className="mt-4 text-sm text-red-400">{generate.error.message}</p>
              )}
              {generate.isPending && (
                <p className="mt-4 text-xs text-ink-faint">This takes a moment — we&apos;re writing it.</p>
              )}
            </div>
          )}

          {/* The book */}
          {book && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-soft">
                  {generate.data?.hasData ? "Composed from your records" : "A start — add documents to enrich it"}
                </p>
                <Button size="sm" variant="outline" onClick={() => generate.mutate(orgId ? { orgId } : undefined)} disabled={generate.isPending}>
                  {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Recompose
                </Button>
              </div>

              {/* Title page */}
              <Page>
                <div className="flex min-h-[16rem] flex-col items-center justify-center text-center">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-stone-400">A keepsake edition</p>
                  <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">{book.title}</h1>
                  {book.subtitle && <p className="mt-3 font-serif text-lg text-stone-500">{book.subtitle}</p>}
                  {book.dedication && (
                    <p className="mt-10 max-w-sm font-serif text-[15px] italic leading-relaxed text-stone-600">{book.dedication}</p>
                  )}
                </div>
              </Page>

              {/* Chapters */}
              {book.chapters.map((ch, i) => (
                <Page key={i}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-700">Chapter {i + 1}</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-900">{ch.title}</h2>
                  <div className="mt-5 space-y-4">
                    {ch.body.split(/\n{2,}/).map((para, j) => (
                      <p key={j} className="font-serif text-[15px] leading-[1.8] text-stone-700">{para}</p>
                    ))}
                  </div>
                </Page>
              ))}

              {/* By the numbers */}
              {book.byTheNumbers.length > 0 && (
                <Page>
                  <h2 className="font-serif text-2xl font-semibold text-stone-900">By the numbers</h2>
                  <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
                    {book.byTheNumbers.map((s, i) => (
                      <div key={i}>
                        <div className="font-serif text-3xl font-semibold text-stone-900">{s.value}</div>
                        <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </Page>
              )}

              {/* Closing */}
              {book.closing && (
                <Page>
                  <div className="flex min-h-[8rem] items-center justify-center">
                    <p className="max-w-md text-center font-serif text-lg italic leading-relaxed text-stone-700">{book.closing}</p>
                  </div>
                  <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Compiled by Successio
                  </p>
                </Page>
              )}

              {/* Order CTA (print flow ships next) */}
              <div className="rounded-2xl border border-amber/25 bg-amber/[0.05] p-6 text-center">
                <p className="text-sm font-medium text-ink">Order the hardcover keepsake</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
                  A clothbound edition, printed and shipped to your door. Coming soon — printed on demand, no minimums.
                </p>
                <Button size="sm" className="mt-4" disabled>Order hardcover — coming soon</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/** A warm "paper" page panel. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-[#f7f3ea] p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] md:p-12"
    >
      {children}
    </motion.div>
  );
}
