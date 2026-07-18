"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";

const settingsSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  founded: z.number().int().min(1800).max(2030).optional().or(z.literal("")),
  employeeCount: z.number().int().positive().optional().or(z.literal("")),
  annualRevenue: z.number().positive().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
});

// Use string fields for all numeric inputs so RHF controls the raw input value,
// and we parse to numbers before the mutation.
type SettingsFormRaw = {
  name: string;
  location?: string;
  founded?: string;
  employeeCount?: string;
  annualRevenue?: string;
  description?: string;
};

export default function SettingsPage() {
  const [ingestCopied, setIngestCopied] = useState(false);
  const { data: org } = trpc.businesses.getOrg.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const updateOrg = trpc.businesses.updateOrg.useMutation();
  const sendVerify = trpc.auth.sendVerificationEmail.useMutation();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SettingsFormRaw>({
    // When the org query resolves after the user has started typing, keep
    // their keystrokes — without this, the async `values` sync resets the
    // form and silently wipes everything they entered.
    resetOptions: { keepDirtyValues: true },
    values: org
      ? {
          name: org.name,
          location: org.location ?? "",
          founded: org.founded?.toString() ?? "",
          employeeCount: org.employeeCount?.toString() ?? "",
          annualRevenue: org.annualRevenue?.toString() ?? "",
          description: org.description ?? "",
        }
      : undefined,
  });

  const onSubmit = (data: SettingsFormRaw) =>
    updateOrg.mutate({
      name: data.name,
      location: data.location,
      founded: data.founded ? parseInt(data.founded, 10) : undefined,
      employeeCount: data.employeeCount ? parseInt(data.employeeCount, 10) : undefined,
      annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : undefined,
      description: data.description,
    });

  return (
    <>
      <AppTopNav title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account & email verification */}
          <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
            <h2 className="text-lg font-semibold text-ink">Account</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink">{me?.email ?? "—"}</p>
                <p className="mt-0.5 text-xs">
                  {me?.emailVerified ? (
                    <span className="text-emerald-400">Email verified</span>
                  ) : (
                    <span className="text-amber">Email not verified</span>
                  )}
                </p>
              </div>
              {me && !me.emailVerified && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendVerify.mutate()}
                  disabled={sendVerify.isPending || sendVerify.isSuccess}
                >
                  {sendVerify.isSuccess ? "Email sent — check your inbox" : sendVerify.isPending ? "Sending…" : "Send verification email"}
                </Button>
              )}
            </div>
            {sendVerify.error && (
              <p className="mt-3 text-sm text-red-400">{sendVerify.error.message}</p>
            )}
          </div>

          {/* Private email-ingest address */}
          {org && (
            <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
              <h2 className="text-lg font-semibold text-ink">Email documents in</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                Anything emailed to this address lands in your Document Vault and processes
                automatically — perfect for forwards from your bookkeeper or a copier that
                emails PDFs. The address is unique to your business; share it only with
                people you trust to add documents.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-edge bg-canvas px-3 py-2.5 font-mono text-xs text-amber-bright">
                  docs+{org.id}@successio.pro
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`docs+${org.id}@successio.pro`);
                    setIngestCopied(true);
                    setTimeout(() => setIngestCopied(false), 2000);
                  }}
                >
                  {ingestCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Up to 10 attachments per email, 25 MB each.{" "}
                <a href="/help/email-documents" className="text-amber underline underline-offset-2">
                  How it works
                </a>
              </p>
            </div>
          )}

          {/* Billing */}
          <div className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
            <h2 className="text-lg font-semibold text-ink">Billing</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Successio is free while you get set up. When you&apos;re ready, the Owner plan is
              $49/month (or $39/month billed annually) with a 14-day free trial — cancel anytime.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://buy.stripe.com/28EfZidRdes9c1JbMges001"
                className="rounded-xl bg-amber px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-bright"
              >
                Subscribe monthly — $49/mo
              </a>
              <a
                href="https://buy.stripe.com/aFaeVedRd3Nv9TBeYses002"
                className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-edge-strong hover:text-ink"
              >
                Annual — $39/mo, save 20%
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Checkout is handled securely by Stripe. Use the email on this account so we can match
              your subscription. Full pricing on the{" "}
              <a href="/pricing" className="text-amber underline underline-offset-2">pricing page</a>.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-2xl border border-edge bg-canvas-soft/50 p-7 space-y-5"
          >
            <h2 className="text-lg font-semibold text-ink">Business details</h2>

            <Field label="Business name" error={errors.name?.message}>
              <input {...register("name")} className="input-base" placeholder="Brenner Precision Machining" />
            </Field>
            <Field label="Location" error={errors.location?.message}>
              <input {...register("location")} className="input-base" placeholder="Akron, Ohio" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year founded" error={errors.founded?.message}>
                <input {...register("founded")} type="number" className="input-base" placeholder="1987" />
              </Field>
              <Field label="Employees" error={errors.employeeCount?.message}>
                <input {...register("employeeCount")} type="number" className="input-base" placeholder="31" />
              </Field>
            </div>
            <Field label="Annual revenue (USD)" error={errors.annualRevenue?.message}>
              <input {...register("annualRevenue")} type="number" className="input-base" placeholder="6240000" />
            </Field>
            <Field label="Business description (for profile narrative)" error={errors.description?.message}>
              <textarea
                {...register("description")}
                rows={4}
                className="input-base resize-none"
                placeholder="A precision machine shop serving Tier-1 auto and aerospace suppliers since 1987…"
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || updateOrg.isPending}>
                {updateOrg.isPending ? "Saving…" : "Save changes"}
              </Button>
              {updateOrg.isSuccess && (
                <span className="text-sm text-emerald-400">Saved!</span>
              )}
              {updateOrg.error && (
                <span className="text-sm text-red-400">{updateOrg.error.message}</span>
              )}
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-soft">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
