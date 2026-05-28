import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Compare", href: "/compare" },
      { label: "Pricing", href: "/pricing" },
      { label: "Live demo", href: "/demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Why we exist", href: "/why" },
      { label: "The trades we serve", href: "/why" },
      { label: "Contact", href: "/contact" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "For associations", href: "/partners" },
      { label: "Foundations & alliances", href: "/partners" },
      { label: "CDFIs & lenders", href: "/partners" },
      { label: "Become a partner", href: "/contact?plan=partner" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-canvas-soft/30">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/30">
                <svg viewBox="0 0 24 24" className="size-5" fill="none">
                  <path d="M8 14a4 4 0 1 1 8 0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 14v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="6" r="2.5" fill="#fbbf24" />
                </svg>
              </span>
              <span className="text-base font-semibold text-ink">Successio</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft text-pretty">
              Helping blue-collar owners pass the torch — built on Cloudflare,
              powered by AI, distributed through the associations workers trust.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-edge pt-8 text-sm text-ink-faint md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Successio. Pass the torch.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-ink-soft">Privacy</Link>
            <Link href="#" className="hover:text-ink-soft">Security</Link>
            <Link href="#" className="hover:text-ink-soft">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
