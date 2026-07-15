"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Lock, AlertTriangle, Loader2, FileQuestion, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate, TranslateMenu } from "@/components/shared/translate";

interface ShareData {
  tier: string;
  org: { name?: string; vertical?: string; location?: string | null; founded?: number | null; employeeCount?: number | null };
  profile: Record<string, string>;
  tokenId: string;
}

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

const SECTION_ORDER = Object.keys(SECTION_LABELS);

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // NDA gate state
  const [ndaName, setNdaName] = useState("");
  const [ndaEmail, setNdaEmail] = useState("");
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaSubmitting, setNdaSubmitting] = useState(false);

  // Engagement tracking: which sections the visitor actually scrolled to, and
  // for how long they had the page open. Flushed via sendBeacon on page hide.
  const viewIdRef = useRef<string | null>(null);
  const viewedSectionsRef = useRef<Set<string>>(new Set());
  const openedAtRef = useRef<number>(Date.now());

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  const logView = useCallback(async (tok: string, extra?: { name?: string; email?: string }) => {
    try {
      const res = await fetch(`/api/share/${tok}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extra ?? {}),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { viewId?: string; profile?: Record<string, string>; org?: ShareData["org"] };
      if (json.viewId) viewIdRef.current = json.viewId;
      return json;
    } catch {
      return null;
    }
  }, []);

  // Flush the engagement beacon when the visitor leaves or hides the tab.
  useEffect(() => {
    if (!token) return;
    const flush = () => {
      if (!viewIdRef.current) return;
      const payload = JSON.stringify({
        viewId: viewIdRef.current,
        sections: [...viewedSectionsRef.current].slice(0, 20),
        durationSeconds: Math.min(Math.round((Date.now() - openedAtRef.current) / 1000), 86_400),
      });
      try {
        navigator.sendBeacon(`/api/share/${token}/track`, payload);
      } catch { /* beacon is best-effort */ }
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d: unknown) => {
        const data = d as Record<string, unknown>;
        if (data.error) { setError(data.error as string); return; }
        setData(data as unknown as ShareData);
        // Log public tier view immediately
        if (data.tier === "public") logView(token);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [token, logView]);

  const submitNda = async () => {
    if (!token || !ndaName || !ndaEmail) return;
    setNdaSubmitting(true);
    // The server releases the full confidential payload only in this response.
    const result = await logView(token, { name: ndaName, email: ndaEmail });
    if (result?.profile) {
      setData((prev) =>
        prev
          ? { ...prev, profile: result.profile!, org: { ...prev.org, ...result.org } }
          : prev
      );
    }
    setNdaAccepted(true);
    setNdaSubmitting(false);
  };

  const needsNda = data?.tier !== "public" && !ndaAccepted;

  // On-demand translation of the profile — each section's label + body as one
  // aligned batch, so the whole deal room reads in the viewer's language.
  const visibleKeys = data ? SECTION_ORDER.filter((key) => key in data.profile) : [];
  const segments = data
    ? visibleKeys.flatMap((k) => [SECTION_LABELS[k] ?? k, data.profile[k]])
    : [];
  const t = useTranslate(segments, { auto: true });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2 className="size-8 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
        <AlertTriangle className="size-10 text-amber" />
        <h1 className="text-xl font-semibold text-ink">{error}</h1>
        <p className="text-sm text-ink-soft max-w-sm">
          This link may have expired or been revoked. Contact the business owner for a new link.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-edge bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber/10">
              <Building2 className="size-5 text-amber" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{data.org.name ?? "Business Profile"}</p>
              <p className="text-xs text-ink-faint capitalize">{data.org.vertical}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(ndaAccepted || data.tier === "public") && visibleKeys.length > 0 && (
              <TranslateMenu lang={t.lang} isPending={t.isPending} onChoose={t.choose} />
            )}
            <TierBadge tier={data.tier} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">

        {/* NDA Gate */}
        <AnimatePresence>
          {needsNda && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-amber/30 bg-amber/[0.04] p-7"
            >
              <div className="flex items-center gap-3 mb-4">
                <Lock className="size-5 text-amber" />
                <h2 className="text-base font-semibold text-ink">Confidential Information</h2>
              </div>
              <p className="text-sm text-ink-soft mb-5">
                This profile contains non-public financial and operational information shared in confidence.
                By entering your details below, you agree to keep this information confidential and use it
                only for evaluating a potential acquisition.
              </p>
              <div className="space-y-3">
                <input
                  value={ndaName}
                  onChange={(e) => setNdaName(e.target.value)}
                  placeholder="Full name"
                  className="input-base"
                />
                <input
                  value={ndaEmail}
                  onChange={(e) => setNdaEmail(e.target.value)}
                  placeholder="Email address"
                  type="email"
                  className="input-base"
                />
                <Button
                  onClick={submitNda}
                  disabled={!ndaName || !ndaEmail || ndaSubmitting}
                  className="w-full"
                >
                  {ndaSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  I agree — view the full profile
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Org meta strip */}
        {(ndaAccepted || data.tier === "public") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 grid grid-cols-3 gap-3"
          >
            {[
              { label: "Industry", value: data.org.vertical },
              { label: "Founded", value: data.org.founded ?? "—" },
              { label: "Location", value: data.org.location ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-edge bg-canvas-soft/40 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink capitalize">{String(value)}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Profile sections */}
        {(ndaAccepted || data.tier === "public") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {visibleKeys.map((key, i) => (
                <motion.section
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onViewportEnter={() => viewedSectionsRef.current.add(key)}
                  viewport={{ amount: 0.4 }}
                  className="rounded-2xl border border-edge bg-canvas-soft/30 p-6"
                >
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber">
                    {t.lang ? t.display[i * 2] : SECTION_LABELS[key] ?? key}
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">
                    {t.lang ? t.display[i * 2 + 1] : data.profile[key]}
                  </p>
                </motion.section>
              ))}

            {/* Buyer tier: request specific documents (human-in-the-loop) */}
            {data.tier === "buyer" && token && (
              <DocumentRequestCard token={token} defaultName={ndaName} defaultEmail={ndaEmail} />
            )}

            {/* Confidentiality footer */}
            <div className="rounded-xl bg-white/[0.02] p-4 text-center">
              <p className="text-xs text-ink-faint">
                This document is confidential and intended solely for the authorized recipient.
                Do not distribute, reproduce, or disclose without written consent.
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink-faint/50">
                Powered by Successio · {new Date().getFullYear()}
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function DocumentRequestCard({ token, defaultName, defaultEmail }: { token: string; defaultName: string; defaultEmail: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [request, setRequest] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/share/${token}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, request }),
      });
      if (res.ok) {
        setState("sent");
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? "Something went wrong — try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error — try again.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-6 text-center">
        <Check className="mx-auto size-6 text-emerald-400" />
        <p className="mt-2 text-sm font-medium text-ink">Request sent to the owner</p>
        <p className="mt-1 text-xs text-ink-soft">
          They&apos;ll review it and follow up with you at {email}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-6">
      <div className="mb-4 flex items-center gap-3">
        <FileQuestion className="size-5 text-sky-400" />
        <h2 className="text-base font-semibold text-ink">Need something specific?</h2>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        Request additional documents — tax returns, customer contracts, equipment appraisals —
        and the owner will review and respond directly. Nothing is shared automatically.
      </p>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-base" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email" className="input-base" />
        </div>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={3}
          placeholder="e.g. Last 3 years of tax returns and the customer contract for your largest account"
          className="input-base resize-none"
        />
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        <Button
          onClick={submit}
          disabled={!name || !email || request.trim().length < 5 || state === "sending"}
        >
          {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <FileQuestion className="size-4" />}
          Send request to owner
        </Button>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    public:  { label: "Teaser",         cls: "bg-emerald-500/10 text-emerald-400" },
    nda:     { label: "NDA-gated",      cls: "bg-amber/10 text-amber" },
    lender:  { label: "Lender Package", cls: "bg-violet-500/10 text-violet-400" },
    buyer:   { label: "Buyer Access",   cls: "bg-sky-500/10 text-sky-400" },
  };
  const { label, cls } = map[tier] ?? { label: tier, cls: "bg-white/5 text-ink-faint" };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}
