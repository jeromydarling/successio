import { describe, it, expect } from "vitest";
import {
  parsePlan,
  parseMode,
  unitAmountCents,
  checkoutLineItem,
  applyPaymentSucceeded,
  billingStatusLine,
  INSTALLMENT_COUNT,
} from "@/lib/billing";
import { PRICES } from "@/lib/concierge";

describe("plan/mode parsing", () => {
  it("accepts slug and stored spellings, rejects junk", () => {
    expect(parsePlan("new-owner")).toBe("new_owner");
    expect(parsePlan("owner")).toBe("owner");
    expect(parsePlan("partner")).toBeNull();
    expect(parsePlan(undefined)).toBeNull();
    expect(parseMode("installments")).toBe("installments");
    expect(parseMode("monthly")).toBeNull();
  });
});

describe("checkout line items", () => {
  it("one-time is a plain price in cents with no recurrence", () => {
    const li = checkoutLineItem("owner", "once");
    expect(li.price_data.unit_amount).toBe(PRICES.owner.once * 100);
    expect("recurring" in li.price_data).toBe(false);
  });
  it("installments are monthly at the 12-month rate", () => {
    const li = checkoutLineItem("concierge", "installments");
    expect(li.price_data.unit_amount).toBe(PRICES.concierge.monthly12 * 100);
    expect(li.price_data.recurring).toEqual({ interval: "month", interval_count: 1 });
    expect(li.price_data.product_data.description).toContain(`of ${INSTALLMENT_COUNT}`);
  });
  it("amounts are integers (Stripe rejects fractional cents)", () => {
    for (const p of ["new_owner", "owner", "concierge"] as const)
      for (const m of ["once", "installments"] as const)
        expect(Number.isInteger(unitAmountCents(p, m))).toBe(true);
  });
});

describe("applyPaymentSucceeded", () => {
  const t = new Date("2026-10-13T00:00:00Z");
  it("one-time payment marks paid in full immediately", () => {
    const r = applyPaymentSucceeded({ plan: "free", installmentsPaid: 0, planPaidAt: null }, { plan: "owner", mode: "once", at: t });
    expect(r.planPaidInFullAt).toEqual(t);
    expect(r.completeInstallments).toBe(false);
    expect(r.installmentsPaid).toBe(0);
  });
  it("installments count up and complete on the 12th", () => {
    let state = { plan: "free", installmentsPaid: 0, planPaidAt: null as Date | null };
    for (let i = 1; i <= INSTALLMENT_COUNT; i++) {
      const r = applyPaymentSucceeded(state, { plan: "owner", mode: "installments", at: t });
      expect(r.installmentsPaid).toBe(i);
      expect(r.completeInstallments).toBe(i === INSTALLMENT_COUNT);
      expect(r.planPaidInFullAt).toEqual(i === INSTALLMENT_COUNT ? t : null);
      state = { plan: r.plan, installmentsPaid: r.installmentsPaid, planPaidAt: r.planPaidAt };
    }
  });
  it("never counts past 12 even if Stripe retries deliver extra invoices", () => {
    const r = applyPaymentSucceeded({ plan: "owner", installmentsPaid: 12, planPaidAt: t }, { plan: "owner", mode: "installments", at: t });
    expect(r.installmentsPaid).toBe(12);
  });
  it("preserves the first-payment date across later payments and clears a failure flag", () => {
    const first = new Date("2026-01-01T00:00:00Z");
    const r = applyPaymentSucceeded({ plan: "owner", installmentsPaid: 3, planPaidAt: first }, { plan: "owner", mode: "installments", at: t });
    expect(r.planPaidAt).toEqual(first);
    expect(r.lastPaymentFailedAt).toBeNull();
  });
});

describe("billingStatusLine", () => {
  const base = { plan: "owner", billingMode: "installments", installmentsPaid: 4, planPaidInFullAt: null, lastPaymentFailedAt: null };
  it("free, paying, paid, and problem states read correctly", () => {
    expect(billingStatusLine({ ...base, plan: "free" }).tone).toBe("free");
    const paying = billingStatusLine(base);
    expect(paying.tone).toBe("paying");
    expect(paying.label).toBe("Owner — 4 of 12 payments");
    expect(paying.detail).toContain("8 monthly payments left");
    expect(billingStatusLine({ ...base, planPaidInFullAt: new Date() }).tone).toBe("paid");
    expect(billingStatusLine({ ...base, lastPaymentFailedAt: new Date() }).tone).toBe("problem");
  });
  it("a failure after paying in full is not shown as a problem", () => {
    expect(billingStatusLine({ ...base, planPaidInFullAt: new Date(), lastPaymentFailedAt: new Date() }).tone).toBe("paid");
  });
});
