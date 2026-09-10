"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Building2, Wrench, HardHat, Handshake, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PricingTier {
  id: "new-owner" | "owner" | "concierge" | "partner";
  name: string;
  pitch: string;
  /** One fee — paid in full, or spread over 12 monthly payments. */
  priceOnce?: number;
  priceMonthly12?: number;
  /** Partner uses a custom string instead. */
  customPrice?: string;
  priceSub?: string;
  /** Live checkout links, when present — one-time and 12-month paths. */
  checkout?: { once?: string; installments?: string };
  badge?: string;
  elevated?: boolean;
  variant: "primary" | "outline" | "ghost";
  features: string[];
  cta: { label: string; href: string; ariaLabel: string };
  note?: string;
}

const ICONS: Record<PricingTier["id"], LucideIcon> = {
  "new-owner": HardHat,
  owner: Wrench,
  concierge: Handshake,
  partner: Building2,
};

function money(n: number): string {
  return n.toLocaleString("en-US");
}

export function PricingCards({ tiers }: { tiers: PricingTier[] }) {
  const [spread, setSpread] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* Payment toggle */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
        <span className={cn("text-sm", !spread ? "text-ink" : "text-ink-faint")}>Pay in full</span>
        <button
          type="button"
          role="switch"
          aria-checked={spread}
          aria-label="Toggle spreading payments over 12 months"
          onClick={() => setSpread((s) => !s)}
          className={cn(
            "relative h-7 w-12 rounded-full border transition-colors duration-200",
            spread ? "border-amber/40 bg-amber/30" : "border-edge bg-white/[0.06]"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-amber-bright transition-all duration-200",
              spread ? "left-[1.6rem]" : "left-1"
            )}
          />
        </button>
        <span className={cn("text-sm", spread ? "text-ink" : "text-ink-faint")}>
          Spread over 12 months
        </span>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
          One fee, no subscription
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t) => {
          const Icon = ICONS[t.id];
          const checkoutHref = spread ? t.checkout?.installments : t.checkout?.once;
          return (
            <div
              key={t.id}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-canvas-soft/40 p-6",
                t.elevated ? "border-amber-bright ring-2 ring-amber xl:scale-[1.02]" : "border-edge"
              )}
            >
              {t.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                    t.elevated ? "bg-amber text-canvas" : "border border-edge bg-canvas text-ink-soft"
                  )}
                >
                  {t.badge}
                </span>
              )}

              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/25">
                  <Icon className="size-4 text-amber" />
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-ink">{t.name}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{t.pitch}</p>

              {/* Price */}
              <div className="mt-5 min-h-[4.25rem]">
                {t.customPrice ? (
                  <>
                    <div className="text-3xl font-semibold tracking-tight text-ink">{t.customPrice}</div>
                    {t.priceSub && <p className="mt-1 text-xs text-ink-faint">{t.priceSub}</p>}
                  </>
                ) : t.priceOnce != null && t.priceMonthly12 != null ? (
                  <div key={spread ? "s" : "o"} className="animate-price-swap">
                    {spread ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-semibold tracking-tight text-ink">
                            ${money(t.priceMonthly12)}
                          </span>
                          <span className="text-sm text-ink-faint">/mo × 12</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-faint">
                          ${money(t.priceMonthly12 * 12)} total · then it&apos;s yours, nothing more
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-semibold tracking-tight text-ink">
                            ${money(t.priceOnce)}
                          </span>
                          <span className="text-sm text-ink-faint">once</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-faint">
                          save ${money(t.priceMonthly12 * 12 - t.priceOnce)} vs. monthly
                        </p>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {/* CTA */}
              <Link href={t.cta.href} className="mt-5 block">
                <Button
                  variant={t.variant}
                  aria-label={t.cta.ariaLabel}
                  className={cn("w-full", t.variant === "ghost" && "border border-edge-strong")}
                >
                  {t.cta.label}
                </Button>
              </Link>
              {t.note && <p className="mt-2.5 text-center text-xs text-ink-faint">{t.note}</p>}
              {checkoutHref && (
                <a
                  href={checkoutHref}
                  className="mt-2 block text-center text-xs font-medium text-amber underline underline-offset-2 hover:text-amber-bright"
                >
                  Ready now? {spread ? "Start 12 monthly payments" : "Pay once"}
                </a>
              )}

              {/* Features */}
              <ul className="mt-6 space-y-2.5 border-t border-edge pt-6">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
