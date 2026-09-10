"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import {
  conciergeIntakeSchema,
  CONCIERGE_TIMELINES,
  type ConciergeIntake,
  type ConciergeIntakeInput,
} from "@/lib/concierge";

const TRADES: { value: ConciergeIntake["vertical"]; label: string }[] = [
  { value: "manufacturing", label: "Machine shop / manufacturing" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "construction", label: "Construction" },
  { value: "trucking", label: "Trucking" },
  { value: "agriculture", label: "Agriculture" },
];

export function IntakeForm() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // If the visitor is signed in, prefill from their account (public page —
  // an unauthenticated query just errors quietly).
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const org = trpc.businesses.getOrg.useQuery(undefined, { retry: false, enabled: !!me.data });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConciergeIntakeInput, unknown, ConciergeIntake>({
    resolver: zodResolver(conciergeIntakeSchema),
    defaultValues: { hasPaper: false, hasDigital: false, hasQuickbooks: false, timeline: "under_6mo", website: "" },
  });

  useEffect(() => {
    if (me.data) {
      setValue("name", me.data.name, { shouldDirty: false });
      setValue("email", me.data.email, { shouldDirty: false });
    }
    if (org.data) {
      setValue("businessName", org.data.name, { shouldDirty: false });
      setValue("vertical", org.data.vertical as ConciergeIntake["vertical"], { shouldDirty: false });
      if (org.data.location) setValue("location", org.data.location, { shouldDirty: false });
    }
  }, [me.data, org.data, setValue]);

  const onSubmit = async (data: ConciergeIntake) => {
    setServerError(null);
    const res = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setServerError(body.error ?? "Something went wrong — please try again or email us.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
        <CheckCircle2 className="size-6 text-emerald-400" />
        <p className="mt-3 text-sm font-semibold text-ink">We&apos;ve got it.</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          A confirmation is on its way to your inbox, and a specialist will reach out within one
          business day to schedule your kickoff call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
      <Field label="Your name" id="c-name" error={errors.name?.message}>
        <input id="c-name" {...register("name")} autoComplete="name" className="input-base" />
      </Field>
      <Field label="Email" id="c-email" error={errors.email?.message}>
        <input id="c-email" {...register("email")} type="email" autoComplete="email" className="input-base" />
      </Field>
      <Field label="Phone (optional)" id="c-phone" error={errors.phone?.message}>
        <input id="c-phone" {...register("phone")} type="tel" autoComplete="tel" className="input-base" />
      </Field>
      <Field label="Business name" id="c-business" error={errors.businessName?.message}>
        <input id="c-business" {...register("businessName")} autoComplete="organization" className="input-base" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trade" id="c-trade" error={errors.vertical?.message}>
          <select id="c-trade" {...register("vertical")} className="input-base" defaultValue="">
            <option value="" disabled>Choose…</option>
            {TRADES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Timeline" id="c-timeline" error={errors.timeline?.message}>
          <select id="c-timeline" {...register("timeline")} className="input-base">
            {Object.entries(CONCIERGE_TIMELINES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Location (optional)" id="c-location" error={errors.location?.message}>
        <input id="c-location" {...register("location")} placeholder="Akron, Ohio" className="input-base" />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink-soft">What do your records look like?</legend>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" {...register("hasPaper")} className="size-4 accent-amber" /> Paper files — a filing cabinet, a shoebox
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" {...register("hasDigital")} className="size-4 accent-amber" /> Digital files — PDFs, spreadsheets, a shared drive
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" {...register("hasQuickbooks")} className="size-4 accent-amber" /> QuickBooks or other accounting software
        </label>
      </fieldset>

      <Field label="Anything we should know? (optional)" id="c-notes" error={errors.notes?.message}>
        <textarea id="c-notes" {...register("notes")} rows={3} className="input-base resize-none" />
      </Field>

      {/* Honeypot — hidden from people, filled by bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      {serverError && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request concierge"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-ink-faint">
        No payment now. We&apos;ll confirm scope and price on the kickoff call.
      </p>
    </form>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-soft">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
