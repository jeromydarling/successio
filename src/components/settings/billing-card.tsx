"use client";

/**
 * Settings → Billing. Shows the org's real plan state (free / N of 12 paid /
 * paid in full / payment problem) and offers live Stripe checkout when
 * billing is configured. Also completes a checkout the visitor started
 * before signing up (?checkout=plan:mode).
 */

import { useEffect, useRef } from "react";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { billingStatusLine, PLAN_LABELS } from "@/lib/billing";
import { PRICES } from "@/lib/concierge";
import { CheckoutButton } from "@/components/billing/checkout-button";

export function BillingCard() {
  const { data: org } = trpc.businesses.getOrg.useQuery();
  const billing = trpc.config.billing.useQuery();
  const resumed = useRef(false);

  // Resume a checkout chosen on the pricing page before signup.
  useEffect(() => {
    if (resumed.current || !billing.data?.enabled) return;
    const want = new URLSearchParams(window.location.search).get("checkout");
    if (!want || want === "success" || !want.includes(":")) return;
    resumed.current = true;
    const [plan, mode] = want.split(":");
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, mode }),
    })
      .then((r) => r.json() as Promise<{ url?: string }>)
      .then((b) => { if (b.url) window.location.href = b.url; })
      .catch(() => {});
  }, [billing.data?.enabled]);

  const justPaid = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success";
  const status = org
    ? billingStatusLine({
        plan: org.plan,
        billingMode: org.billingMode,
        installmentsPaid: org.installmentsPaid,
        planPaidInFullAt: org.planPaidInFullAt,
        lastPaymentFailedAt: org.lastPaymentFailedAt,
      })
    : null;
  const paidInFull = status?.tone === "paid";

  return (
    <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-amber" />
        <h2 className="text-lg font-semibold text-ink">Billing</h2>
      </div>

      {justPaid && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="size-4" /> Payment received — thank you. A receipt is on its way.
        </p>
      )}

      {status && (
        <div className="mt-4 flex items-start gap-3">
          {status.tone === "problem" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />
          ) : status.tone === "paid" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          ) : null}
          <div>
            <p className="text-sm font-medium text-ink">{status.label}</p>
            <p className="text-xs text-ink-soft">{status.detail}</p>
          </div>
        </div>
      )}

      {!paidInFull && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            One fee — <span className="text-ink">${PRICES.owner.once} once</span>, or 12 monthly
            payments of ${PRICES.owner.monthly12} — and the {PLAN_LABELS.owner} plan is yours. No
            subscription.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {billing.data?.enabled ? (
              <>
                <CheckoutButton plan="owner" mode="once" variant="button">
                  Pay ${PRICES.owner.once} once
                </CheckoutButton>
                <CheckoutButton plan="owner" mode="installments" variant="button" className="bg-transparent border border-edge text-ink-soft hover:bg-white/[0.04] hover:text-ink">
                  12 × ${PRICES.owner.monthly12}/mo
                </CheckoutButton>
              </>
            ) : (
              <a href="/pricing" className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-bright">
                See pricing
              </a>
            )}
            <a
              href="/concierge"
              className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-edge-strong hover:text-ink"
            >
              Have us do it for you
            </a>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            {billing.data?.enabled
              ? "Checkout is handled securely by Stripe. We never see your card."
              : "We'll send a secure checkout link to this account's email when you're ready — or "}
            {!billing.data?.enabled && <a href="/contact" className="text-amber underline underline-offset-2">ask us</a>}
            {!billing.data?.enabled && " any time."}
          </p>
        </>
      )}
    </div>
  );
}
