"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Lock, Globe, Building2, Copy, Check } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    key: "public",
    label: "Teaser",
    icon: Globe,
    description: "Business name, industry, general description. No financials. Anyone with the link.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "nda",
    label: "NDA-gated",
    icon: Lock,
    description: "Full profile including financials, customer count, process docs. Requires name + email.",
    color: "text-amber",
    bg: "bg-amber/10",
  },
  {
    key: "lender",
    label: "Lender Package",
    icon: Building2,
    description: "Raw extracted data JSON + all source documents. For CDFIs and SBA lenders.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
] as const;

export default function ProfilePage() {
  const [activeTier, setActiveTier] = useState<"public" | "nda" | "lender">("public");
  const [copied, setCopied] = useState(false);
  const { data: org } = trpc.businesses.getOrg.useQuery();
  const { data: score } = trpc.businesses.latestScore.useQuery();

  const fakeLink = `https://successio.app/share/demo-${activeTier}-token`;

  const copy = () => {
    navigator.clipboard.writeText(fakeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AppTopNav title="Deal Room" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Profile status */}
          <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {org?.name ?? "Your Business"}
                </h2>
                <p className="text-sm text-ink-soft">{org?.vertical} · Sale Readiness: <span className="font-mono text-amber-bright">{score?.score ?? "—"}</span> / 100</p>
              </div>
              <Button size="sm" disabled={!score || score.score < 40}>
                <Share2 className="size-4" /> Generate profile
              </Button>
            </div>
            {(!score || score.score < 40) && (
              <p className="mt-3 rounded-xl bg-amber/[0.06] px-4 py-3 text-sm text-amber-bright/80">
                Upload more documents to reach a score of 40 before generating your buyer profile.
              </p>
            )}
          </div>

          {/* Share tier selector */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Share access tiers</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {TIERS.map((tier) => (
                <button
                  key={tier.key}
                  onClick={() => setActiveTier(tier.key)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    activeTier === tier.key
                      ? "border-amber/40 bg-amber/[0.06]"
                      : "border-edge hover:border-edge-strong"
                  )}
                >
                  <div className={cn("flex size-9 items-center justify-center rounded-lg", tier.bg)}>
                    <tier.icon className={cn("size-5", tier.color)} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{tier.label}</p>
                  <p className="mt-1 text-xs text-ink-soft">{tier.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Share link */}
          <div className="rounded-xl border border-edge bg-canvas-soft/40 p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-ink-faint mb-3">
              {TIERS.find(t => t.key === activeTier)?.label} link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-edge bg-canvas px-3 py-2 font-mono text-xs text-ink-soft">
                {fakeLink}
              </code>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Access log placeholder */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Access log</h3>
            <div className="rounded-xl border border-dashed border-edge py-10 text-center">
              <Share2 className="mx-auto size-8 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-soft">No views yet</p>
              <p className="mt-1 text-xs text-ink-faint">Share a link to start tracking viewer activity</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
