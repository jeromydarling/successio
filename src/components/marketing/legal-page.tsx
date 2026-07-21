/** Shared shell for legal & policy pages (terms, privacy, security). */

import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { renderMarkdown } from "@/lib/help/markdown";

export function LegalPage({
  eyebrow,
  title,
  updated,
  body,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  body: string;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32" id="main-content">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-xs text-ink-faint">Last updated: {updated}</p>
        <hr className="my-8 border-edge" />
        <div>{renderMarkdown(body)}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
