"use client";

/**
 * Shows the owner where their done-for-you engagement stands. Renders nothing
 * unless a concierge request exists for this account.
 */

import { Handshake } from "lucide-react";
import { trpc } from "@/lib/trpc-client";

const TONE: Record<string, string> = {
  neutral: "bg-amber/10 text-amber",
  active: "bg-amber/15 text-amber-bright",
  done: "bg-emerald-500/10 text-emerald-400",
  off: "bg-white/[0.06] text-ink-faint",
};

export function ConciergeStatusCard() {
  const { data } = trpc.account.conciergeStatus.useQuery();
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Handshake className="size-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-ink">Concierge</h2>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${TONE[data.tone]}`}>
          {data.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{data.message}</p>
      {(data.scheduledFor || data.assignee) && (
        <p className="mt-2 text-xs text-ink-faint">
          {data.assignee && <>Your specialist: <span className="text-ink">{data.assignee}</span></>}
          {data.assignee && data.scheduledFor && " · "}
          {data.scheduledFor && <>Kickoff: <span className="text-ink">{data.scheduledFor}</span></>}
        </p>
      )}
    </div>
  );
}
