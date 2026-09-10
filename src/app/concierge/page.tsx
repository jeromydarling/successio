import { Phone, FileStack, Mic, FileText, ShieldCheck, Clock } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { IntakeForm } from "@/components/concierge/intake-form";
import { pageMetadata } from "@/lib/seo";
import { PRICES } from "@/lib/concierge";

export const metadata = pageMetadata({
  title: "Concierge — we build it for you",
  description:
    "Hand us the shoebox. A named specialist collects your records, reviews every extracted record, runs your knowledge interviews, and delivers a buyer-ready profile in 30 days. One flat fee.",
  path: "/concierge",
});

const STEPS = [
  { icon: Phone, title: "Kickoff call", body: "Thirty minutes. We learn the business, agree on what to collect, and put the interviews on the calendar." },
  { icon: FileStack, title: "We collect and scan", body: "Mail us the paper, share a drive, or forward emails. We handle every file and check each extracted record by hand." },
  { icon: Mic, title: "Knowledge interviews", body: "Two recorded conversations about how the business really runs — quoting, customers, what breaks — turned into written procedures." },
  { icon: FileText, title: "Profile, audited with you", body: "We draft your buyer profile and lender package, then go through every number together before anything is shared." },
];

const INCLUDED = [
  "Everything in the Owner plan",
  "A named specialist, start to finish",
  "Every AI-extracted record reviewed by a person",
  "Two recorded knowledge interviews → procedures",
  "Buyer profile written, polished, and audited with you",
  "Lender package assembled and diligence-checked",
  "Delivered in 30 days or less, with a walkthrough call",
];

export default function ConciergePage() {
  return (
    <main className="relative" id="main-content">
      <SiteNav />

      <section className="relative overflow-hidden pt-36 pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-grid-fade" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="mx-auto max-w-3xl px-5 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Concierge · done for you</span>
          <h1 className="mt-4 text-balance text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            Hand us the shoebox. We build the whole record.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft text-pretty">
            You ran the business for thirty years; you shouldn&apos;t have to learn software to
            sell it. A named specialist does the collecting, checking, interviewing, and writing —
            with you on the phone, not on your own.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
            <span>
              <span className="text-2xl font-semibold text-ink">${PRICES.concierge.once.toLocaleString()}</span> once
            </span>
            <span className="text-ink-faint">or</span>
            <span>
              <span className="text-2xl font-semibold text-ink">${PRICES.concierge.monthly12}</span>/mo × 12
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
              <Clock className="size-3.5" /> Delivered in 30 days
            </span>
          </div>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">How it works</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <div key={s.title} className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
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

            <h2 className="mt-12 text-2xl font-semibold tracking-tight text-ink">What&apos;s included</h2>
            <ul className="mt-5 space-y-2.5">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-ink-faint">
              Your records are handled under the same security and privacy controls as every
              Successio account — encrypted twice at rest, exportable and deletable by you at any
              time. See <a href="/security" className="text-amber underline underline-offset-2">Security</a>.
            </p>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-6">
              <h2 className="text-lg font-semibold text-ink">Request concierge</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Tell us a little about the business. We&apos;ll reach out within one business day
                to schedule your kickoff — no payment until we&apos;ve talked.
              </p>
              <div className="mt-5">
                <IntakeForm />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
