"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Building2, Wrench, HardHat, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PricingTier {
  id: "new-owner" | "owner" | "partner";
  name: string;
  pitch: string;
  /** Self-serve tiers use numeric prices; Partner uses a custom string. */
  priceMonthly?: number;
  priceAnnual?: number;
  annualSave?: string;
  customPrice?: string;
  priceSub?: string;
  /** Live Stripe payment links (monthly/annual) — renders a "subscribe now" path. */
  subscribe?: { monthly: string; annual: string };
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
  partner: Building2,
};

export function PricingCards({ tiers }: { tiers: PricingTier[] }) {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Billing toggle */}
      <div className="mb-10 flex items-center justify-center gap-4">
        <span className={cn("text-sm", !annual ? "text-ink" : "text-ink-faint")}>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((a) => !a)}
          className={cn(
            "relative h-7 w-12 rounded-full border transition-colors duration-200",
            annual ? "border-amber/40 bg-amber/30" : "border-edge bg-white/[0.06]"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-amber-bright transition-all duration-200",
              annual ? "left-[1.6rem]" : "left-1"
            )}
          />
        </button>
        <span className={cn("text-sm", annual ? "text-ink" : "text-ink-faint")}>Annual</span>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
          Save 20%
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
        {tiers.map((t) => {
          const Icon = ICONS[t.id];
          const price = annual ? t.priceAnnual : t.priceMonthly;
          return (
            <div
              key={t.id}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-canvas-soft/40 p-6",
                t.elevated
                  ? "border-amber-bright ring-2 ring-amber md:scale-[1.02]"
                  : "border-edge"
              )}
            >
              {t.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold",
                    t.elevated
                      ? "bg-amber text-canvas"
                      : "border border-edge bg-canvas text-ink-soft"
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
                ) : (
                  <div key={annual ? "a" : "m"} className="animate-price-swap">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight text-ink">${price}</span>
                      <span className="text-sm text-ink-faint">/mo</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">
                      {annual ? `billed annually · ${t.annualSave}` : "billed monthly"}
                    </p>
                  </div>
                )}
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
              {t.subscribe && (
                <a
                  href={annual ? t.subscribe.annual : t.subscribe.monthly}
                  className="mt-2 block text-center text-xs font-medium text-amber underline underline-offset-2 hover:text-amber-bright"
                >
                  Ready now? Subscribe — 14-day free trial, cancel anytime
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
