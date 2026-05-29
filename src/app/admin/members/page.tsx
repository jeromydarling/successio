"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import type { Vertical } from "@/lib/verticals";

const VERTICALS = ["manufacturing", "hvac", "plumbing", "electrical", "construction", "trucking", "agriculture"];

interface ParsedRow {
  businessName: string;
  contactEmail: string;
  vertical: string;
  valid: boolean;
}

/** Parse "Business Name, email, vertical" lines into rows. */
function parseRoster(text: string): ParsedRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [businessName = "", contactEmail = "", verticalRaw = ""] = line.split(",").map((s) => s.trim());
      const vertical = verticalRaw.toLowerCase();
      const valid =
        businessName.length > 0 &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail) &&
        VERTICALS.includes(vertical);
      return { businessName, contactEmail, vertical, valid };
    });
}

export default function MembersImportPage() {
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const rows = useMemo(() => parseRoster(text), [text]);
  const validRows = rows.filter((r) => r.valid);

  const { data: invites = [] } = trpc.admin.listInvites.useQuery();

  const importMutation = trpc.admin.importMembers.useMutation({
    onSuccess: () => {
      setText("");
      utils.admin.listInvites.invalidate();
      utils.admin.overview.invalidate();
    },
  });
  const revokeMutation = trpc.admin.revokeInvite.useMutation({
    onSuccess: () => utils.admin.listInvites.invalidate(),
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Import members</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Paste your roster — one member per line as{" "}
        <span className="font-mono text-ink">Business Name, email, vertical</span>. Each gets a
        branded invite link to claim their profile.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={"Brenner Precision Machining, carl@brenner.com, manufacturing\nAcme HVAC, owner@acmehvac.com, hvac"}
        className="input-base mt-5 resize-none font-mono text-xs"
      />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-ink-faint">
          {validRows.length} valid · {rows.length - validRows.length} invalid
          {rows.length > validRows.length && " (check format & vertical)"}
        </p>
        <Button
          onClick={() => importMutation.mutate({ members: validRows.map(({ businessName, contactEmail, vertical }) => ({ businessName, contactEmail, vertical: vertical as Vertical })) })}
          disabled={validRows.length === 0 || importMutation.isPending}
          size="sm"
        >
          {importMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Create {validRows.length} invite{validRows.length === 1 ? "" : "s"}
        </Button>
      </div>

      {/* Invites */}
      <h2 className="mt-12 text-sm font-semibold text-ink">Invites ({invites.length})</h2>
      {invites.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">No invites yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-edge rounded-2xl border border-edge">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{inv.businessName}</p>
                <p className="truncate text-xs text-ink-faint">{inv.contactEmail} · {inv.vertical}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  inv.status === "claimed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber/15 text-amber"
                )}>
                  {inv.status}
                </span>
                {inv.status === "pending" && <CopyLink token={inv.token} />}
                <button
                  onClick={() => revokeMutation.mutate({ id: inv.id })}
                  className="flex size-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Revoke invite"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const url = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1 text-xs text-ink-soft transition-colors hover:text-ink"
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Invite link"}
    </button>
  );
}
