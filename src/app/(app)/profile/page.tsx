"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Lock, Globe, Building2, Copy, Check,
  RefreshCw, Eye, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Download, Users2, ExternalLink,
} from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    key: "public" as const,
    label: "Teaser",
    icon: Globe,
    description: "Business name, industry, general description. No financials. Anyone with the link.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "nda" as const,
    label: "NDA-gated",
    icon: Lock,
    description: "Full profile including financials, customer count, process docs. Requires name + email.",
    color: "text-amber",
    bg: "bg-amber/10",
  },
  {
    key: "lender" as const,
    label: "Lender Package",
    icon: Building2,
    description: "Raw extracted data JSON + all source documents. For CDFIs and SBA lenders.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
] as const;

const SECTION_LABELS: Record<string, string> = {
  executive_summary:    "Executive Summary",
  business_overview:    "Business Overview",
  opportunity:          "The Opportunity",
  customer_overview:    "Customer Overview",
  financial_highlights: "Financial Highlights",
  operations:           "Operations",
  team:                 "Team & People",
  equipment_and_assets: "Equipment & Assets",
  reason_for_sale:      "Reason for Sale",
};

export default function ProfilePage() {
  const [activeTier, setActiveTier] = useState<"public" | "nda" | "lender">("public");
  const [copiedTier, setCopiedTier] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("executive_summary");

  const utils = trpc.useUtils();
  const { data: org } = trpc.businesses.getOrg.useQuery();
  const { data: score } = trpc.businesses.latestScore.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.profiles.get.useQuery();
  const { data: views = [] } = trpc.profiles.listViews.useQuery();
  const { data: tokens = [] } = trpc.profiles.listShareTokens.useQuery();

  const generateMutation = trpc.profiles.generate.useMutation({
    onSuccess: () => {
      utils.profiles.get.invalidate();
      utils.profiles.listShareTokens.invalidate();
    },
  });

  const getTokenMutation = trpc.profiles.getShareToken.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/share/${data.token}`;
      navigator.clipboard.writeText(link);
      setCopiedTier(data.tier);
      setTimeout(() => setCopiedTier(null), 2500);
      utils.profiles.listShareTokens.invalidate();
    },
  });

  const revokeTokenMutation = trpc.profiles.revokeToken.useMutation({
    onSuccess: () => utils.profiles.listShareTokens.invalidate(),
  });

  const exportPdfMutation = trpc.profiles.exportPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    },
  });

  const canGenerate = score && score.score >= 30;

  return (
    <>
      <AppTopNav title="Deal Room" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Profile status / generate */}
          <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {org?.name ?? "Your Business"}
                </h2>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {org?.vertical} · Readiness:{" "}
                  <span className="font-mono text-amber-bright">{score?.score ?? "—"}</span> / 100
                </p>
                {profile && (
                  <p className="mt-1 text-xs text-emerald-400">Profile generated</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {profile && (
                  <Button
                    onClick={() => exportPdfMutation.mutate()}
                    disabled={exportPdfMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {exportPdfMutation.isPending ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    PDF
                  </Button>
                )}
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !canGenerate}
                  size="sm"
                >
                  {generateMutation.isPending ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  {profile ? "Regenerate profile" : "Generate profile"}
                </Button>
              </div>
            </div>
            {!canGenerate && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber/[0.06] px-4 py-3">
                <AlertTriangle className="size-4 shrink-0 text-amber mt-0.5" />
                <p className="text-sm text-amber-bright/80">
                  Upload more documents to reach a score of 30 before generating your buyer profile.
                </p>
              </div>
            )}
          </div>

          {/* Profile preview */}
          <AnimatePresence>
            {profile?.content && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="mb-3 text-sm font-semibold text-ink">Profile preview</h3>
                <div className="space-y-2">
                  {Object.entries(SECTION_LABELS)
                    .filter(([key]) => key in (profile.content ?? {}))
                    .map(([key, label]) => (
                      <div key={key} className="rounded-xl border border-edge bg-canvas-soft/30">
                        <button
                          onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                          className="flex w-full items-center justify-between p-4 text-left"
                        >
                          <span className="text-sm font-medium text-ink">{label}</span>
                          {expandedSection === key ? (
                            <ChevronUp className="size-4 text-ink-faint" />
                          ) : (
                            <ChevronDown className="size-4 text-ink-faint" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedSection === key && profile.content && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="border-t border-edge px-4 pb-4 pt-3 text-sm leading-relaxed text-ink-soft">
                                {profile.content[key as keyof typeof profile.content]}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Share tier selector */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Share access tiers</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {TIERS.map((tier) => {
                const existingToken = tokens.find((t) => t.tier === tier.key);
                return (
                  <div
                    key={tier.key}
                    onClick={() => setActiveTier(tier.key)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-all",
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
                    {existingToken && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
                        <Eye className="size-3" /> {existingToken.viewCount} view{existingToken.viewCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Share link actions */}
          <div className="rounded-xl border border-edge bg-canvas-soft/40 p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {TIERS.find((t) => t.key === activeTier)?.label} link
            </p>
            <div className="flex items-center gap-2">
              {(() => {
                const tok = tokens.find((t) => t.tier === activeTier);
                const shareLink = tok ? `${typeof window !== "undefined" ? window.location.origin : "https://successio.app"}/share/${tok.id}` : null;
                return (
                  <>
                    <code className="flex-1 truncate rounded-lg border border-edge bg-canvas px-3 py-2 font-mono text-xs text-ink-soft">
                      {shareLink ?? "(no link yet — click Generate to create one)"}
                    </code>
                    {tok ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(shareLink!);
                            setCopiedTier(activeTier);
                            setTimeout(() => setCopiedTier(null), 2500);
                          }}
                        >
                          {copiedTier === activeTier ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeTokenMutation.mutate({ token: tok.id })}
                          disabled={revokeTokenMutation.isPending}
                        >
                          <Trash2 className="size-4 text-red-400" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => getTokenMutation.mutate({ tier: activeTier })}
                        disabled={getTokenMutation.isPending || !profile}
                      >
                        {getTokenMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                        Create link
                      </Button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Communis worker co-op CTA */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <Users2 className="size-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-ink">Worker Co-op Acquisition</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Interested in a worker buyout? Communis connects retiring owners with employee ownership
                  pathways — ESOPs, co-ops, and worker ownership transitions. Keep the business in the hands
                  of the people who built it.
                </p>
                <a
                  href="https://communis.coop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Explore worker co-op pathways <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Lender package download (for lender-tier tokens) */}
          {tokens.some((t) => t.tier === "lender") && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">CDFI / SBA Lender Package</h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    Full JSON bundle: profile narrative, financials, customers, equipment, and document index.
                  </p>
                </div>
                <a
                  href={`/api/lender-package/${tokens.find((t) => t.tier === "lender")?.id}`}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
                >
                  <Download className="size-4" /> Download
                </a>
              </div>
            </div>
          )}

          {/* Access audit log */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Access log</h3>
            {views.length === 0 ? (
              <div className="rounded-xl border border-dashed border-edge py-10 text-center">
                <Eye className="mx-auto size-8 text-ink-faint" />
                <p className="mt-3 text-sm text-ink-soft">No views yet</p>
                <p className="mt-1 text-xs text-ink-faint">Share a link to start tracking viewer activity</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-edge">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-edge bg-canvas-soft/30">
                      <th className="px-4 py-3 text-left font-medium text-ink-faint">Viewer</th>
                      <th className="px-4 py-3 text-left font-medium text-ink-faint">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-ink-faint">Tier</th>
                      <th className="px-4 py-3 text-left font-medium text-ink-faint">Viewed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map((view) => {
                      const matchingToken = tokens.find((t) => t.id === view.tokenId);
                      return (
                        <tr key={view.id} className="border-b border-edge/50 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-ink">{view.viewerName ?? "Anonymous"}</td>
                          <td className="px-4 py-3 text-ink-soft">{view.viewerEmail ?? "—"}</td>
                          <td className="px-4 py-3 capitalize text-ink-soft">{matchingToken?.tier ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-ink-faint">
                            {new Date(view.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
