import Link from "next/link";
import { Check, X, Phone, FileStack, Mic, FileText, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingCards, type PricingTier } from "@/components/marketing/pricing-cards";
import { pageMetadata } from "@/lib/seo";
import { PRICES } from "@/lib/concierge";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "One fee to get your business sale-ready — pay once or spread it over 12 months. No subscription. Or let our concierge team build the whole record for you.",
  path: "/pricing",
});

const PRICING_CONTENT = {
  hero: {
    h1: "One fee. Not a subscription.",
    sub: "Getting a business ready to hand off is a project, not a monthly bill. Pay once — or spread it over a year — and it's done.",
  },
  tiers: [
    {
      id: "new-owner",
      name: "New Owner",
      pitch: "Hit the ground running on day one.",
      priceOnce: PRICES.newOwner.once,
      priceMonthly12: PRICES.newOwner.monthly12,
      variant: "outline",
      cta: { label: "Start free", href: "/signup?plan=new-owner", ariaLabel: "Start free on the New Owner plan" },
      note: "14-day free trial · no card required",
      features: [
        "Full inherited document vault from the seller",
        "All extracted knowledge and SOPs",
        "Ongoing document uploads",
        "Readiness Score tracking for future transitions",
        "Worker-ownership resources (co-ops, ESOPs)",
        "Standard support",
      ],
    },
    {
      id: "owner",
      name: "Owner",
      pitch: "Get your business ready to hand off — yourself.",
      priceOnce: PRICES.owner.once,
      priceMonthly12: PRICES.owner.monthly12,
      badge: "Most popular",
      elevated: true,
      variant: "primary",
      cta: { label: "Start free", href: "/signup?plan=owner", ariaLabel: "Start free on the Owner plan" },
      note: "14-day free trial · no card required",
      features: [
        "Unlimited uploads — PDFs, scans, photos, spreadsheets, QuickBooks",
        "AI extraction tuned to your trade",
        "Sale Readiness Score (0–100) with live checklist",
        "Voice knowledge capture → written procedures",
        "Buyer-ready Business Profile (CIM-lite) + PDF",
        "Tiered share links: Teaser, NDA-gated, Lender, Buyer",
        "Document vault for the life of the sale",
        "Worker-ownership resources (co-ops, ESOPs)",
      ],
    },
    {
      id: "concierge",
      name: "Concierge",
      pitch: "Hand us the shoebox. We build the whole record.",
      priceOnce: PRICES.concierge.once,
      priceMonthly12: PRICES.concierge.monthly12,
      badge: "Done for you",
      variant: "outline",
      cta: { label: "Request concierge", href: "/concierge", ariaLabel: "Request the done-for-you concierge service" },
      note: "Includes everything in Owner",
      features: [
        "We collect your records — mail us the paper, or we scan on a call",
        "A named specialist reviews every extracted record by hand",
        "Two recorded knowledge interviews, turned into procedures",
        "Your buyer profile written, polished, and audited with you",
        "Lender package assembled and diligence-checked",
        "Delivered in 30 days or less, with a walkthrough call",
      ],
    },
    {
      id: "partner",
      name: "Partner",
      pitch: "Offer succession readiness as a member benefit.",
      customPrice: "Custom",
      priceSub: "priced by member count",
      badge: "For associations",
      variant: "ghost",
      cta: { label: "Talk to us", href: "/contact?plan=partner", ariaLabel: "Contact us about the Partner association plan" },
      features: [
        "White-labeled instance with your branding",
        "Unlimited member organization seats",
        "Aggregate member readiness dashboard",
        "All trade configurations",
        "Dedicated onboarding + priority support",
        "Lender package exports for member deal flow",
      ],
    },
  ] satisfies PricingTier[],
  comparison: {
    cols: ["New Owner", "Owner", "Concierge", "Partner"],
    rows: [
      { label: "Document uploads", cells: ["Ongoing", "Unlimited", "We do it", "Unlimited"] },
      { label: "AI extraction, tuned per trade", cells: [true, true, true, true] },
      { label: "Every record reviewed by a person", cells: [false, false, true, false] },
      { label: "Sale Readiness Score", cells: [true, true, true, true] },
      { label: "Voice knowledge capture", cells: [false, true, "Guided interviews", true] },
      { label: "Business Profile + PDF", cells: [false, true, "Written with you", true] },
      { label: "Share link tiers", cells: [false, true, true, true] },
      { label: "Lender package", cells: [false, true, "Assembled for you", true] },
      { label: "Association white-labeling", cells: [false, false, false, true] },
      { label: "Aggregate member dashboard", cells: [false, false, false, true] },
      { label: "Support", cells: ["Standard", "Priority", "Named specialist", "Dedicated"] },
    ] as { label: string; cells: (boolean | string)[] }[],
  },
  faq: [
    {
      q: "What does “one fee” actually mean?",
      a: "You pay once — in full, or as 12 monthly payments — and that's it. There's no subscription that quietly keeps billing after your record is built. Your account, documents, and profile stay available through your sale and the handoff.",
    },
    {
      q: "Can I try it before paying?",
      a: "Yes. Owner and New Owner start with a 14-day free trial, no card required. You'll see your readiness score build from your first upload before you decide.",
    },
    {
      q: "How does spreading payments work?",
      a: "Choose 12 monthly payments at checkout. After the twelfth payment you're done — nothing further is charged. Paying in full up front is a little cheaper.",
    },
    {
      q: "What's included in Concierge?",
      a: "Everything in Owner, plus a named specialist who does the work with you: collecting your records (mail us the paper if you like), reviewing every extracted record by hand, running two recorded knowledge interviews, writing and auditing your buyer profile, and assembling the lender package — delivered within 30 days with a walkthrough call.",
    },
    {
      q: "How does the Association Partner license work?",
      a: "We white-label a Successio instance under your association's brand. Your members access it as a member benefit, and you get an admin dashboard showing aggregate readiness across your membership. Pricing scales with member count — contact us for a quote.",
    },
    {
      q: "Can I get my data out?",
      a: "Any time. Settings → Security & privacy has a one-click export of everything we hold — every document's text, every extracted record, your profile, share links, and view logs — as a single file. You can also permanently delete your account there.",
    },
    {
      q: "What industries does Successio support?",
      a: "Manufacturing and machine shops, HVAC, plumbing, electrical, general contracting, trucking, and agriculture. More trades are added regularly.",
    },
  ],
};

const CONCIERGE_STEPS = [
  { icon: Phone, title: "Kickoff call", body: "30 minutes. We learn the business, agree on what to collect, and schedule the interviews." },
  { icon: FileStack, title: "We collect & scan", body: "Mail us the paper, share a drive, or forward emails — we handle every file and review each extraction." },
  { icon: Mic, title: "Knowledge interviews", body: "Two recorded conversations about how the business really runs, turned into written procedures." },
  { icon: FileText, title: "Profile, audited", body: "We draft your buyer profile and lender package, then go through every number with you." },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto size-4 text-amber" aria-label="Included" />;
  if (value === false) return <X className="mx-auto size-4 text-ink-faint" aria-label="Not included" />;
  return <span className="text-sm text-ink-soft">{value}</span>;
}

export default function PricingPage() {
  const c = PRICING_CONTENT;
  return (
    <main className="relative" id="main-content">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h1 className="text-balance text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            {c.hero.h1}
          </h1>
          <p className="mt-4 text-lg text-ink-soft text-pretty">{c.hero.sub}</p>
        </div>
      </section>

      {/* Cards + payment toggle */}
      <section className="relative pb-16">
        <PricingCards tiers={c.tiers} />
      </section>

      {/* Concierge: how it works */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Concierge · done for you</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Prefer we do it for you?
            </h2>
            <p className="mt-3 text-lg text-ink-soft text-pretty">
              Some owners would rather hand us the shoebox. A named specialist builds your entire
              business record and buyer profile with you on the phone — white-glove, one flat fee.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONCIERGE_STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-edge bg-canvas/40 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/25">
                    <s.icon className="size-4 text-emerald-400" />
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/concierge"
              className="inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-emerald-400"
            >
              Request concierge — ${PRICES.concierge.once.toLocaleString()} once, or ${PRICES.concierge.monthly12}/mo × 12
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
              <ShieldCheck className="size-3.5" /> Same security and privacy controls as every account
            </span>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="relative py-24">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Compare every plan
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-edge">
                  <th className="py-3 pr-4 text-left text-sm font-medium text-ink-faint"></th>
                  {c.comparison.cols.map((col) => (
                    <th key={col} className="px-4 py-3 text-center text-sm font-semibold text-ink">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.rows.map((row) => (
                  <tr key={row.label} className="border-b border-edge/60">
                    <td className="py-3 pr-4 text-left text-sm text-ink-soft">{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <Cell value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative border-t border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Questions, answered
          </h2>
          <div className="space-y-3">
            {c.faq.map((item) => (
              <details
                key={item.q}
                name="faq"
                className="group rounded-2xl border border-edge bg-canvas-soft/40 px-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-base font-medium text-ink">
                  {item.q}
                  <span className="ml-4 text-ink-faint transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
