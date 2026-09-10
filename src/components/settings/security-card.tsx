"use client";

/**
 * Settings → Security & privacy. Every control the owner has over their own
 * account: two-factor auth, active devices, the activity log, a full data
 * export, and permanent deletion. Designed so a nervous owner can see —
 * not just be told — that the account is locked down.
 */

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Download,
  Trash2,
  Lock,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

function when(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SecurityCard({ orgName }: { orgName: string }) {
  const utils = trpc.useUtils();
  const overview = trpc.account.securityOverview.useQuery();
  const refresh = () => utils.account.securityOverview.invalidate();

  return (
    <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-ink">Security &amp; privacy</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        You&apos;re trusting us with the financial record of your business. Here is
        exactly what protects it, and the controls that are yours.
      </p>

      {overview.data && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <Lock className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">Encrypted at rest, twice.</span> Your files and
            database are encrypted by the platform, and the text of every document, every extracted
            record, and your two-factor secret are encrypted <em>again</em> at the application layer
            with a key held outside the database — a database breach alone yields ciphertext.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <TwoFactor overview={overview.data} email={overview.data?.email} onChange={refresh} />
        <Devices sessions={overview.data?.sessions ?? []} onChange={refresh} />
        <Activity events={overview.data?.events ?? []} />
        <ExportData />
        <DeleteAccount orgName={orgName} />
      </div>
    </div>
  );
}

// ── Two-factor ────────────────────────────────────────────────────────────────

function TwoFactor({
  overview,
  email,
  onChange,
}: {
  overview: { totpEnabled: boolean; totpPending: boolean } | undefined;
  email: string | undefined;
  onChange: () => void;
}) {
  const [enroll, setEnroll] = useState<{ secret: string; uri: string; qr?: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState("");

  const begin = trpc.account.beginTotpEnrollment.useMutation({
    onSuccess: async (d) => {
      const QR = await import("qrcode");
      const qr = await QR.toDataURL(d.uri, { margin: 1, width: 176 });
      setEnroll({ ...d, qr });
    },
  });
  const confirm = trpc.account.confirmTotpEnrollment.useMutation({
    onSuccess: (d) => {
      setRecovery(d.recoveryCodes);
      setEnroll(null);
      setCode("");
      onChange();
    },
  });
  const disable = trpc.account.disableTotp.useMutation({
    onSuccess: () => {
      setDisabling(false);
      setPassword("");
      setCode("");
      onChange();
    },
  });

  return (
    <section>
      <SectionHeading icon={Smartphone} title="Two-factor authentication">
        {overview?.totpEnabled ? (
          <Badge tone="good">On</Badge>
        ) : (
          <Badge tone="warn">Off</Badge>
        )}
      </SectionHeading>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        A six-digit code from an authenticator app on your phone is required to sign in — so a
        stolen password alone can&apos;t get in.
      </p>

      {recovery && (
        <div className="mt-4 rounded-xl border border-amber/30 bg-amber/[0.05] p-4">
          <p className="text-sm font-medium text-ink">Save these recovery codes now.</p>
          <p className="mt-1 text-xs text-ink-soft">
            Each works once if you lose your phone. We only keep a scrambled copy — this is the
            only time they&apos;ll be shown.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-sm text-ink">
            {recovery.map((c) => (
              <span key={c} className="rounded-md bg-canvas px-2 py-1">{c}</span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <CopyButton text={recovery.join("\n")} label="Copy codes" />
            <Button type="button" variant="outline" size="sm" onClick={() => setRecovery(null)}>
              I&apos;ve saved them
            </Button>
          </div>
        </div>
      )}

      {!overview?.totpEnabled && !enroll && !recovery && (
        <div className="mt-3">
          <Button type="button" size="sm" onClick={() => begin.mutate()} disabled={begin.isPending}>
            {begin.isPending ? "Preparing…" : "Turn on two-factor"}
          </Button>
          {begin.error && <ErrorText>{begin.error.message}</ErrorText>}
        </div>
      )}

      {enroll && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[176px_1fr]">
          {enroll.qr && (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URI
            <img src={enroll.qr} alt="Scan this QR code with your authenticator app" className="size-44 rounded-lg bg-white p-1" />
          )}
          <div className="space-y-3">
            <p className="text-xs text-ink-soft">
              1. Open Google Authenticator, 1Password, Authy, or any authenticator app and scan
              this code{email ? ` for ${email}` : ""}.
            </p>
            <p className="text-xs text-ink-soft">
              Can&apos;t scan? Enter this key manually:{" "}
              <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-amber-bright">
                {enroll.secret.match(/.{1,4}/g)?.join(" ")}
              </code>
            </p>
            <p className="text-xs text-ink-soft">2. Enter the six-digit code the app shows:</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="input-base w-36 font-mono tracking-widest"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => confirm.mutate({ code })}
                disabled={confirm.isPending || code.replace(/\D/g, "").length !== 6}
              >
                {confirm.isPending ? "Checking…" : "Verify & turn on"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEnroll(null)}>
                Cancel
              </Button>
            </div>
            {confirm.error && <ErrorText>{confirm.error.message}</ErrorText>}
          </div>
        </div>
      )}

      {overview?.totpEnabled && !disabling && (
        <div className="mt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setDisabling(true)}>
            Turn off two-factor
          </Button>
        </div>
      )}

      {disabling && (
        <div className="mt-4 space-y-3 rounded-xl border border-edge p-4">
          <p className="text-xs text-ink-soft">
            To turn it off, confirm your password and a current code (or a recovery code).
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="input-base w-48"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input-base w-36 font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => disable.mutate({ password, code })}
              disabled={disable.isPending || !password || code.length < 6}
            >
              {disable.isPending ? "Turning off…" : "Confirm"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDisabling(false)}>
              Cancel
            </Button>
          </div>
          {disable.error && <ErrorText>{disable.error.message}</ErrorText>}
        </div>
      )}
    </section>
  );
}

// ── Devices ───────────────────────────────────────────────────────────────────

function Devices({
  sessions,
  onChange,
}: {
  sessions: {
    id: string;
    device: string;
    createdAt: Date | string;
    lastSeenAt: Date | string | null;
    current: boolean;
  }[];
  onChange: () => void;
}) {
  const revoke = trpc.account.revokeSession.useMutation({
    onSuccess: (r) => {
      if (r.signedOutSelf) window.location.href = "/login";
      else onChange();
    },
  });
  const revokeAll = trpc.account.revokeAllOtherSessions.useMutation({ onSuccess: onChange });

  return (
    <section>
      <SectionHeading icon={KeyRound} title="Signed-in devices">
        {sessions.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending}
          >
            <LogOut className="size-3.5" />
            {revokeAll.isPending ? "Signing out…" : "Sign out all other devices"}
          </Button>
        )}
      </SectionHeading>
      <ul className="mt-3 divide-y divide-edge rounded-xl border border-edge">
        {sessions.length === 0 && (
          <li className="px-4 py-3 text-xs text-ink-faint">No device records yet.</li>
        )}
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {s.device}
                {s.current && (
                  <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                    This device
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-faint">
                Signed in {when(s.createdAt)} · last active {when(s.lastSeenAt ?? s.createdAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => revoke.mutate({ id: s.id })}
              disabled={revoke.isPending}
            >
              Sign out
            </Button>
          </li>
        ))}
      </ul>
      {(revoke.error || revokeAll.error) && (
        <ErrorText>{revoke.error?.message ?? revokeAll.error?.message}</ErrorText>
      )}
    </section>
  );
}

// ── Activity ──────────────────────────────────────────────────────────────────

function Activity({
  events,
}: {
  events: { id: string; type: string; label: string; device: string; createdAt: Date | string }[];
}) {
  const alarming = new Set(["login_failed", "mfa_challenge_failed", "new_device_login", "recovery_code_used"]);
  return (
    <section>
      <SectionHeading icon={ShieldCheck} title="Security activity" />
      <p className="mt-1 text-xs text-ink-soft">
        Every sign-in, failed attempt, and change to your account. If something here wasn&apos;t
        you, reset your password and sign out all devices.
      </p>
      <ul className="mt-3 max-h-64 divide-y divide-edge overflow-y-auto rounded-xl border border-edge">
        {events.length === 0 && (
          <li className="px-4 py-3 text-xs text-ink-faint">No activity recorded yet.</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className={`text-sm ${alarming.has(e.type) ? "text-amber-bright" : "text-ink"}`}>{e.label}</p>
              <p className="text-xs text-ink-faint">{e.device}</p>
            </div>
            <span className="shrink-0 text-xs text-ink-faint">{when(e.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function ExportData() {
  const [done, setDone] = useState(false);
  const exportData = trpc.account.exportData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `successio-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    },
  });
  return (
    <section>
      <SectionHeading icon={Download} title="Your data, on demand" />
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Download everything we hold about your business — every document&apos;s text, every
        extracted record, profiles, share links, and view logs — as one file. It&apos;s yours; no
        lock-in.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          <Download className="size-3.5" />
          {exportData.isPending ? "Preparing…" : "Download my data"}
        </Button>
        {done && <span className="text-xs text-emerald-400">Downloaded.</span>}
      </div>
      {exportData.error && <ErrorText>{exportData.error.message}</ErrorText>}
    </section>
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

function DeleteAccount({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const del = trpc.account.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = "/?deleted=1";
    },
  });
  const ready = password.length > 0 && confirmName.trim().toLowerCase() === orgName.trim().toLowerCase();

  return (
    <section>
      <SectionHeading icon={Trash2} title="Delete this account" />
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Permanently removes every document, extracted record, profile, and share link — from the
        database, file storage, and search index. Not a soft delete. Download your data first.
      </p>
      {!open ? (
        <div className="mt-3">
          <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setOpen(true)}>
            Delete account…
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
          <p className="text-xs text-ink-soft">
            Type <span className="font-mono text-ink">{orgName}</span> and your password to confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Business name"
              className="input-base w-56"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="input-base w-48"
            />
            <Button
              type="button"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-400"
              onClick={() => del.mutate({ password, confirmName })}
              disabled={!ready || del.isPending}
            >
              {del.isPending ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {del.error && <ErrorText>{del.error.message}</ErrorText>}
        </div>
      )}
    </section>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="size-4 text-amber" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: "good" | "warn"; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
        tone === "good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber/10 text-amber"
      }`}
    >
      {children}
    </span>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-red-400">{children}</p>;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
