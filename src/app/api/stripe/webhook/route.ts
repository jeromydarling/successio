/**
 * POST /api/stripe/webhook — the source of truth for entitlement.
 *
 * Signature-verified. Idempotent by event id (stripe_events table). Handles:
 *  - checkout.session.completed  → entitle the org; for installments, attach
 *    a Subscription Schedule that ends after 12 payments (Stripe can't cap a
 *    plain subscription), then record payment #1.
 *  - invoice.paid                → installments 2..12; cancel after the 12th.
 *  - invoice.payment_failed      → flag the org + email the owner.
 *  - customer.subscription.deleted → nothing to entitle; just clear the id.
 *
 * Checkout's own `invoice.paid` for the first cycle is skipped so payment #1
 * isn't double-counted (billing_reason === "subscription_create").
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import type Stripe from "stripe";
import * as schema from "@/db/schema";
import { getStripe, constructWebhookEvent, type StripeEnv } from "@/lib/stripe";
import { applyPaymentSucceeded, parsePlan, parseMode, INSTALLMENT_COUNT, PLAN_LABELS, type Plan, type BillingMode } from "@/lib/billing";
import { getEmailSender, type EmailEnv } from "@/lib/email/sender";
import { paymentReceivedEmail, paymentFailedEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";
import { logSecurityEvent } from "@/lib/security-events";

type WebhookEnv = StripeEnv & EmailEnv & { DB: D1Database; APP_URL?: string };
type Db = ReturnType<typeof drizzle<typeof schema>>;

export async function POST(req: Request) {
  const env = (await getCloudflareContext()).env as unknown as WebhookEnv;
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(env, await req.text(), sig);
  } catch (err) {
    console.warn("[stripe-webhook] bad signature:", err);
    return new Response("bad signature", { status: 400 });
  }

  const db = drizzle(env.DB, { schema });

  // Idempotency: Stripe retries; a second delivery must be a no-op.
  const seen = await db.select({ id: schema.stripeEvents.id }).from(schema.stripeEvents).where(eq(schema.stripeEvents.id, event.id)).get();
  if (seen) return Response.json({ received: true, duplicate: true });
  await db.insert(schema.stripeEvents).values({ id: event.id, type: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(env, db, event.data.object);
        break;
      case "invoice.paid":
        await onInvoicePaid(env, db, event.data.object);
        break;
      case "invoice.payment_failed":
        await onPaymentFailed(env, db, event.data.object);
        break;
      case "customer.subscription.deleted":
        await db
          .update(schema.organizations)
          .set({ stripeSubscriptionId: null })
          .where(eq(schema.organizations.stripeSubscriptionId, event.data.object.id));
        break;
      default:
        break;
    }
  } catch (err) {
    // Log and ack: Stripe would otherwise retry an event whose handler has a
    // bug, and the idempotency row already marks it consumed.
    console.error(`[stripe-webhook] handler failed for ${event.type} ${event.id}:`, err);
  }
  return Response.json({ received: true });
}

async function onCheckoutCompleted(env: WebhookEnv, db: Db, s: Stripe.Checkout.Session) {
  const orgId = s.metadata?.orgId ?? s.client_reference_id;
  const plan = parsePlan(s.metadata?.plan);
  const mode = parseMode(s.metadata?.mode);
  if (!orgId || !plan || !mode) {
    console.warn("[stripe-webhook] checkout without plan metadata", s.id);
    return;
  }
  const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
  const subscriptionId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;

  if (mode === "installments" && subscriptionId) {
    // Cap the subscription at exactly 12 payments via a schedule.
    const stripe = getStripe(env);
    try {
      const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
      const phase = schedule.phases[0];
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "cancel",
        phases: [
          {
            items: phase.items.map((i) => ({ price: typeof i.price === "string" ? i.price : i.price.id, quantity: i.quantity ?? 1 })),
            start_date: phase.start_date,
            iterations: INSTALLMENT_COUNT,
          },
        ],
      });
    } catch (err) {
      // Non-fatal: invoice.paid still cancels after the 12th as a backstop.
      console.error("[stripe-webhook] schedule cap failed:", err);
    }
  }

  await recordPayment(env, db, orgId, plan, mode, { customerId, subscriptionId, userId: s.metadata?.userId });
}

async function onInvoicePaid(env: WebhookEnv, db: Db, inv: Stripe.Invoice) {
  if (inv.billing_reason === "subscription_create") return; // counted at checkout
  const subId = subscriptionIdOf(inv);
  if (!subId) return;
  const org = await db
    .select({ id: schema.organizations.id, plan: schema.organizations.plan })
    .from(schema.organizations)
    .where(eq(schema.organizations.stripeSubscriptionId, subId))
    .get();
  const plan = parsePlan(org?.plan);
  if (!org || !plan) return;
  await recordPayment(env, db, org.id, plan, "installments", {});
}

async function onPaymentFailed(env: WebhookEnv, db: Db, inv: Stripe.Invoice) {
  const subId = subscriptionIdOf(inv);
  if (!subId) return;
  const org = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name, plan: schema.organizations.plan })
    .from(schema.organizations)
    .where(eq(schema.organizations.stripeSubscriptionId, subId))
    .get();
  if (!org) return;
  await db.update(schema.organizations).set({ lastPaymentFailedAt: new Date() }).where(eq(schema.organizations.id, org.id));

  const owner = await ownerOf(db, org.id);
  if (!owner) return;
  const plan = parsePlan(org.plan);
  try {
    await getEmailSender(env).send({
      to: owner.email,
      ...paymentFailedEmail({
        name: owner.name,
        planLabel: plan ? PLAN_LABELS[plan] : "your plan",
        updateUrl: inv.hosted_invoice_url ?? `${appUrl(env)}/settings`,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook] payment-failed email failed:", err);
  }
}

async function recordPayment(
  env: WebhookEnv,
  db: Db,
  orgId: string,
  plan: Plan,
  mode: BillingMode,
  ids: { customerId?: string | null; subscriptionId?: string | null; userId?: string }
) {
  const current = await db
    .select({
      plan: schema.organizations.plan,
      name: schema.organizations.name,
      installmentsPaid: schema.organizations.installmentsPaid,
      planPaidAt: schema.organizations.planPaidAt,
      stripeSubscriptionId: schema.organizations.stripeSubscriptionId,
    })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .get();
  if (!current) return;

  const next = applyPaymentSucceeded(current, { plan, mode, at: new Date() });
  const subscriptionId = ids.subscriptionId ?? current.stripeSubscriptionId;
  await db
    .update(schema.organizations)
    .set({
      plan: next.plan,
      billingMode: next.billingMode,
      planPaidAt: next.planPaidAt,
      installmentsPaid: next.installmentsPaid,
      planPaidInFullAt: next.planPaidInFullAt,
      lastPaymentFailedAt: null,
      ...(ids.customerId ? { stripeCustomerId: ids.customerId } : {}),
      ...(ids.subscriptionId ? { stripeSubscriptionId: ids.subscriptionId } : {}),
    })
    .where(eq(schema.organizations.id, orgId));

  // Backstop: after the 12th payment, stop the subscription even if the
  // schedule cap didn't take.
  if (next.completeInstallments && subscriptionId) {
    try {
      await getStripe(env).subscriptions.cancel(subscriptionId);
    } catch (err) {
      console.error("[stripe-webhook] final cancel failed:", err);
    }
  }

  await logSecurityEvent(db, { type: "payment_received", userId: ids.userId ?? null, orgId, meta: { plan, mode, installment: next.installmentsPaid } });

  const owner = await ownerOf(db, orgId);
  if (!owner) return;
  try {
    await getEmailSender(env).send({
      to: owner.email,
      ...paymentReceivedEmail({
        name: owner.name,
        planLabel: PLAN_LABELS[plan],
        mode,
        installment: next.installmentsPaid,
        paidInFull: !!next.planPaidInFullAt,
        url: `${appUrl(env)}/dashboard`,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook] receipt email failed:", err);
  }
}

function subscriptionIdOf(inv: Stripe.Invoice): string | null {
  const sub = (inv as unknown as { subscription?: string | { id: string } | null }).subscription
    ?? (inv.parent?.subscription_details?.subscription as string | { id: string } | null | undefined);
  return typeof sub === "string" ? sub : sub?.id ?? null;
}

async function ownerOf(db: Db, orgId: string) {
  return db
    .select({ name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, "owner")))
    .get();
}
