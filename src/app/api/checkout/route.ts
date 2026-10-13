/**
 * POST /api/checkout — start a Stripe Checkout for a plan.
 * Body: { plan: "owner"|"new_owner"|"concierge", mode: "once"|"installments" }
 * Requires a signed-in owner (the org is what gets entitled). Returns the
 * hosted Checkout URL. Prices are inline (no pre-created Stripe products);
 * the org id travels in metadata so the webhook can entitle the right row.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "@/db/schema";
import { verifySession, getTokenFromCookie } from "@/lib/auth";
import { getStripe, isBillingConfigured, type StripeEnv } from "@/lib/stripe";
import { checkoutLineItem, parsePlan, parseMode, INSTALLMENT_COUNT } from "@/lib/billing";
import { appUrl } from "@/lib/app-url";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";

interface CheckoutEnv extends StripeEnv {
  DB: D1Database;
  JWT_SECRET: string;
  SESSIONS?: KVNamespace;
  APP_URL?: string;
}

const bodySchema = z.object({ plan: z.string(), mode: z.string() });

export async function POST(req: Request) {
  const env = (await getCloudflareContext()).env as unknown as CheckoutEnv;
  if (!isBillingConfigured(env)) {
    return Response.json({ error: "Checkout isn't available yet — contact us and we'll send a link." }, { status: 503 });
  }

  const session = await verifySession(getTokenFromCookie(req.headers.get("cookie")) ?? "", env.JWT_SECRET);
  if (!session || session.demo) {
    return Response.json({ error: "Sign in to continue to checkout.", signIn: true }, { status: 401 });
  }

  if (env.SESSIONS) {
    const { allowed } = await rateLimit(env.SESSIONS, `checkout:${await sha256Hex(session.sub)}`, 10, 600);
    if (!allowed) return Response.json({ error: "Too many attempts — try again in a few minutes." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const plan = parsed.success ? parsePlan(parsed.data.plan) : null;
  const mode = parsed.success ? parseMode(parsed.data.mode) : null;
  if (!plan || !mode) return Response.json({ error: "Unknown plan." }, { status: 400 });

  const db = drizzle(env.DB, { schema });
  const org = await db
    .select({
      id: schema.organizations.id,
      name: schema.organizations.name,
      stripeCustomerId: schema.organizations.stripeCustomerId,
      planPaidInFullAt: schema.organizations.planPaidInFullAt,
      plan: schema.organizations.plan,
    })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, session.orgId))
    .get();
  if (!org) return Response.json({ error: "Account not found." }, { status: 404 });
  if (org.planPaidInFullAt && org.plan === plan) {
    return Response.json({ error: "This plan is already paid in full." }, { status: 409 });
  }

  const stripe = getStripe(env);
  const base = appUrl(env);
  const metadata = { orgId: org.id, plan, mode, userId: session.sub };

  const checkout = await stripe.checkout.sessions.create({
    mode: mode === "once" ? "payment" : "subscription",
    line_items: [checkoutLineItem(plan, mode)],
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : { customer_email: session.email, customer_creation: mode === "once" ? "always" : undefined }),
    client_reference_id: org.id,
    metadata,
    ...(mode === "installments"
      ? {
          subscription_data: {
            metadata,
            description: `${INSTALLMENT_COUNT} monthly payments, then nothing more.`,
          },
        }
      : { payment_intent_data: { metadata } }),
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${base}/settings?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
  });

  return Response.json({ url: checkout.url });
}
