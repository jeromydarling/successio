"use client";

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
  const { data: org } = trpc.businesses.getOrg.useQuery();
  const updateOrg = trpc.businesses.updateOrg.useMutation();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SettingsFormRaw>({
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
