/**
 * Stripe client for Workers: the official SDK on the fetch HTTP client, with
 * SubtleCrypto for webhook signatures. One instance per env object.
 */

import Stripe from "stripe";

export interface StripeEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

const cache = new WeakMap<object, Stripe>();

export function isBillingConfigured(env: StripeEnv): boolean {
  return !!env.STRIPE_SECRET_KEY;
}

export function getStripe(env: StripeEnv): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("[stripe] STRIPE_SECRET_KEY is not set — billing is disabled");
  }
  let s = cache.get(env);
  if (!s) {
    s = new Stripe(env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
      // Keep the SDK's pinned default; we only use stable Checkout/Subscription surfaces.
    });
    cache.set(env, s);
  }
  return s;
}

/** Verify + parse a webhook payload. Throws on a bad signature. */
export async function constructWebhookEvent(
  env: StripeEnv,
  rawBody: string,
  signature: string
): Promise<Stripe.Event> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
  }
  return getStripe(env).webhooks.constructEventAsync(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
    undefined,
    Stripe.createSubtleCryptoProvider()
  );
}
