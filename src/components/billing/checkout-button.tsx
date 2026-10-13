"use client";

/**
 * Starts a Stripe Checkout for a plan. Signed-out visitors are sent to signup
 * with the plan remembered, then land back here. Renders nothing when billing
 * isn't configured yet (no STRIPE_SECRET_KEY) so we never show a dead button.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

export function CheckoutButton({
  plan,
  mode,
  children,
  className,
  variant = "link",
}: {
  plan: "new_owner" | "owner" | "concierge";
  mode: "once" | "installments";
  children: React.ReactNode;
  className?: string;
  variant?: "link" | "button";
}) {
  const billing = trpc.config.billing.useQuery(undefined, { staleTime: 5 * 60_000 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!billing.data?.enabled) return null;

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, mode }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; signIn?: boolean };
      if (res.status === 401 || body.signIn) {
        const next = encodeURIComponent(`/settings?checkout=${plan}:${mode}`);
        window.location.href = `/signup?plan=${plan.replace("_", "-")}&next=${next}`;
        return;
      }
      if (!res.ok || !body.url) {
        setError(body.error ?? "Couldn't start checkout — please try again.");
        return;
      }
      window.location.href = body.url;
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className={cn(
          variant === "button"
            ? "rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-bright disabled:opacity-60"
            : "text-xs font-medium text-amber underline underline-offset-2 hover:text-amber-bright disabled:opacity-60",
          className
        )}
      >
        {busy ? "Opening secure checkout…" : children}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
