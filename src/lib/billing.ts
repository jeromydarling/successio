/**
 * Billing — pure logic shared by the checkout route, the webhook, and the UI.
 * No Stripe SDK here, so every branch is unit-testable.
 *
 * Model: one fee per plan, paid once (Checkout mode=payment) or as exactly
 * 12 monthly installments (Checkout mode=subscription + a Subscription
 * Schedule that ends after 12 iterations). Prices come from PRICES.
 */

import { PRICES } from "@/lib/concierge";

export const PLANS = ["new_owner", "owner", "concierge"] as const;
export type Plan = (typeof PLANS)[number];
export const BILLING_MODES = ["once", "installments"] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export const INSTALLMENT_COUNT = 12;

export const PLAN_LABELS: Record<Plan, string> = {
  new_owner: "New Owner",
  owner: "Owner",
  concierge: "Concierge",
};

const PLAN_PRICES: Record<Plan, { once: number; monthly12: number }> = {
  new_owner: PRICES.newOwner,
  owner: PRICES.owner,
  concierge: PRICES.concierge,
};

/** Accepts the URL/slug spelling ("new-owner") as well as the stored one. */
export function parsePlan(raw: string | null | undefined): Plan | null {
  const v = (raw ?? "").replace(/-/g, "_");
  return (PLANS as readonly string[]).includes(v) ? (v as Plan) : null;
}

export function parseMode(raw: string | null | undefined): BillingMode | null {
  return (BILLING_MODES as readonly string[]).includes(raw ?? "") ? (raw as BillingMode) : null;
}

/** Amount in cents for one Checkout line item. */
export function unitAmountCents(plan: Plan, mode: BillingMode): number {
  const p = PLAN_PRICES[plan];
  return (mode === "once" ? p.once : p.monthly12) * 100;
}

/** The inline price Checkout needs — no pre-created Stripe Products. */
export function checkoutLineItem(plan: Plan, mode: BillingMode) {
  const label = PLAN_LABELS[plan];
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: unitAmountCents(plan, mode),
      product_data: {
        name:
          mode === "once"
            ? `Successio ${label} — one-time`
            : `Successio ${label} — 12 monthly payments`,
        description:
          mode === "once"
            ? "One fee. Yours for the life of the sale."
            : `Payment 1 of ${INSTALLMENT_COUNT}. Stops automatically after the twelfth.`,
      },
      ...(mode === "installments" ? { recurring: { interval: "month" as const, interval_count: 1 } } : {}),
    },
  };
}

/** What a successful payment does to the org row. */
export function applyPaymentSucceeded(
  current: { plan: string; installmentsPaid: number; planPaidAt: Date | null },
  event: { plan: Plan; mode: BillingMode; at: Date }
): {
  plan: Plan;
  billingMode: BillingMode;
  planPaidAt: Date;
  installmentsPaid: number;
  planPaidInFullAt: Date | null;
  lastPaymentFailedAt: null;
  /** True when the 12th installment just landed — cancel the subscription. */
  completeInstallments: boolean;
} {
  if (event.mode === "once") {
    return {
      plan: event.plan,
      billingMode: "once",
      planPaidAt: current.planPaidAt ?? event.at,
      installmentsPaid: 0,
      planPaidInFullAt: event.at,
      lastPaymentFailedAt: null,
      completeInstallments: false,
    };
  }
  const paid = Math.min(current.installmentsPaid + 1, INSTALLMENT_COUNT);
  const done = paid >= INSTALLMENT_COUNT;
  return {
    plan: event.plan,
    billingMode: "installments",
    planPaidAt: current.planPaidAt ?? event.at,
    installmentsPaid: paid,
    planPaidInFullAt: done ? event.at : null,
    lastPaymentFailedAt: null,
    completeInstallments: done,
  };
}

/** Owner-facing one-liner for the Settings billing card. Dates arrive as
 *  strings over tRPC; only truthiness matters here. */
export function billingStatusLine(org: {
  plan: string;
  billingMode: string | null;
  installmentsPaid: number;
  planPaidInFullAt: Date | string | null;
  lastPaymentFailedAt: Date | string | null;
}): { label: string; detail: string; tone: "free" | "paying" | "paid" | "problem" } {
  const plan = parsePlan(org.plan);
  if (!plan) {
    return { label: "Free trial", detail: "Everything is open while you get set up.", tone: "free" };
  }
  const name = PLAN_LABELS[plan];
  if (org.lastPaymentFailedAt && !org.planPaidInFullAt) {
    return {
      label: `${name} — payment problem`,
      detail: "Your last monthly payment didn't go through. Update your card to keep your plan.",
      tone: "problem",
    };
  }
  if (org.planPaidInFullAt) {
    return { label: `${name} — paid in full`, detail: "It's yours. Nothing more is owed.", tone: "paid" };
  }
  if (org.billingMode === "installments") {
    return {
      label: `${name} — ${org.installmentsPaid} of ${INSTALLMENT_COUNT} payments`,
      detail: `${INSTALLMENT_COUNT - org.installmentsPaid} monthly payments left, then it's yours.`,
      tone: "paying",
    };
  }
  return { label: name, detail: "Active.", tone: "paid" };
}
