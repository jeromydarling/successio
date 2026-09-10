import { Check, X } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingCards, type PricingTier } from "@/components/marketing/pricing-cards";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple plans for every stage of the handoff. Start free, upgrade when you're ready, or let us do it for you. 14-day trial, cancel anytime.",
  path: "/pricing",
});

const PRICING_CONTENT = {
  hero: {
    h1: "Simple pricing for every stage of the handoff",
    sub: "Whether you're passing the torch or picking it up.",
  },
  tiers: [
    {
      id: "new-owner",
      name: "New Owner",
      pitch: "Hit the ground running on day one.",
      priceMonthly: 29,
      priceAnnual: 24,
      annualSave: "Save 17%",
      variant: "outline",
      cta: { label: "Start Free Trial", href: "/signup?plan=new-owner", ariaLabel: "Start a free trial of the New Owner plan" },
      note: "14-day free trial · No credit card required",
      subscribe: {
        monthly: "https://buy.stripe.com/8x23cw5kHdo56Hp3fKes003",
        annual: "https://buy.stripe.com/cNiaEYaF1abTghZeYses004",
      },
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
      pitch: "Get your business ready to hand off.",
      priceMonthly: 49,
      priceAnnual: 39,
      annualSave: "Save 20%",
      badge: "Most Popular",
      elevated: true,
      variant: "primary",
      cta: { label: "Start Free Trial", href: "/signup?plan=owner", ariaLabel: "Start a free trial of the Owner plan" },
      note: "14-day free trial · No credit card required",
      subscribe: {
        monthly: "https://buy.stripe.com/28EfZidRdes9c1JbMges001",
        annual: "https://buy.stripe.com/aFaeVedRd3Nv9TBeYses002",
      },
      features: [
        "Unlimited uploads — PDFs, scans, photos, spreadsheets, QuickBooks",
        "AI extraction across all verticals",
        "Sale Readiness Score (0–100) with live checklist",
        "Voice knowledge capture → auto-generated SOPs",
        "Business Profile PDF (CIM-lite)",
        "3 share tiers: Teaser, NDA-gated, Lender Package",
        "1-year document vault",
        "Worker-ownership resources (co-ops, ESOPs)",
      ],
    },
    {
      id: "partner",
      name: "Partner",
      pitch: "Offer succession readiness as a member benefit.",
      customPrice: "Starting at $500/mo",
      priceSub: "billed annually",
      badge: "Best for Associations",
      variant: "ghost",
      cta: { label: "Contact Us", href: "/contact?plan=partner", ariaLabel: "Contact us about the Partner association plan" },
      features: [
        "White-labeled instance with your branding",
        "Unlimited member organization seats",
        "Aggregate member readiness dashboard",
        "All vertical configurations",
        "Dedicated onboarding + priority support",
        "CDFI / lender package exports for member deal flow",
      ],
    },
  ] satisfies PricingTier[],
  comparison: {
    cols: ["New Owner", "Owner", "Partner"],
    rows: [
      { label: "Document uploads", cells: ["Ongoing", "Unlimited", "Unlimited"] },
      { label: "AI extraction verticals", cells: [true, true, true] },
      { label: "Sale Readiness Score", cells: [true, true, true] },
      { label: "Voice knowledge capture", cells: [false, true, true] },
      { label: "Business Profile PDF", cells: [false, true, true] },
      { label: "Share link tiers", cells: [false, "3 tiers", true] },
      { label: "Association white-labeling", cells: [false, false, true] },
      { label: "Aggregate member dashboard", cells: [false, false, true] },
      { label: "CDFI lender package export", cells: [false, true, true] },
      { label: "Worker-ownership resources", cells: [true, true, true] },
      { label: "Support level", cells: ["Standard", "Priority", "Dedicated"] },
    ] as { label: string; cells: (boolean | string)[] }[],
  },
  faq: [
    {
      q: "What industries does Successio support?",
      a: "Manufacturing and machine shops, HVAC, plumbing, electrical, general contracting, trucking, and agriculture. More verticals are added regularly.",
    },
    {
      q: "Can I try it before committing?",
      a: "Yes — Owner and New Owner plans include a 14-day free trial, no credit card required. Partner licensing includes a guided demo.",
    },
    {
      q: "How does the Association Partner license work?",
      a: "We white-label a Successio instance under your association's brand. Your members access it as a member benefit, and you get an admin dashboard showing aggregate readiness metrics across your membership. Pricing scales with member count — contact us for a custom quote.",
    },
    {
      q: "What happens to my documents if I cancel?",
      a: "We keep your documents and profiles for 90 days after cancellation, and we'll provide a complete export of everything on request during that window. We never delete your data without notice.",
    },
    {
      q: "How does Successio connect to Communis for worker co-op transitions?",
      a: "Successio prepares the business for sale. If a worker buyout interests you, your Business Profile points you to employee-ownership resources — including Communis, which helps retiring owners explore co-op and ESOP transitions. We link to these resources; there is no formal integration or partnership yet.",
    },
  ],
};

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

      {/* Cards + billing toggle */}
      <section className="relative pb-12">
        <PricingCards tiers={c.tiers} />
      </section>

      {/* Done-for-you concierge */}
      <section className="relative pb-24">
        <div className="mx-auto max-w-3xl px-5">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-7 text-center">
            <h3 className="text-lg font-semibold text-ink">
              Prefer we do it for you?
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              Some owners would rather hand us the shoebox. With the <span className="font-medium text-ink">done-for-you service</span>,
              you email or mail us your records — we scan, upload, review every extraction, and build
              your complete business record and buyer profile with you on the phone. White-glove, flat fee.
            </p>
            <a
              href="/contact?plan=concierge"
              className="mt-4 inline-block rounded-xl border border-emerald-500/40 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              Ask about done-for-you
            </a>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="relative border-y border-edge bg-canvas-soft/30 py-24">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Compare every plan
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
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
      <section className="relative py-24">
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
