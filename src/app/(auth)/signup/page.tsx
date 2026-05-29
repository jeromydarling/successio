"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc-client";
import { signupSchema, type SignupInput } from "@/types";
import { Button } from "@/components/ui/button";

const VERTICALS = [
  { value: "manufacturing", label: "Machine Shop / Manufacturing" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "construction", label: "Construction" },
  { value: "trucking", label: "Trucking / Logistics" },
  { value: "agriculture", label: "Agriculture" },
] as const;

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;
  const [showPassword, setShowPassword] = useState(false);

  const { data: invite } = trpc.admin.inviteInfo.useQuery(
    { token: inviteToken ?? "" },
    { enabled: !!inviteToken }
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  // Prefill from the invite once it resolves.
  useEffect(() => {
    if (invite) {
      setValue("businessName", invite.businessName);
      setValue("vertical", invite.vertical as SignupInput["vertical"]);
    }
  }, [invite, setValue]);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      // Cookie is set by the server; full navigation ensures the authed load.
      window.location.href = "/dashboard";
    },
    onError: (err) => setError("root", { message: err.message }),
  });

  const onSubmit = (data: SignupInput) => signupMutation.mutate({ ...data, inviteToken });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-edge bg-canvas-soft/70 p-8 backdrop-blur-xl"
    >
      <h1 className="text-2xl font-semibold text-ink">Start your profile</h1>
      <p className="mt-1 text-sm text-ink-soft">Takes two minutes. No credit card.</p>

      {invite?.associationName && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber/30 bg-amber/[0.06] px-4 py-3 text-sm text-ink">
          <Building2 className="size-4 shrink-0 text-amber" />
          <span>Invited by <span className="font-semibold">{invite.associationName}</span> — your profile will be part of their program.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your name" error={errors.name?.message}>
            <input {...register("name")} type="text" autoComplete="name" placeholder="Carl Brenner" className="input-base" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input {...register("email")} type="email" autoComplete="email" placeholder="carl@shop.com" className="input-base" />
          </Field>
        </div>

        <Field label="Business name" error={errors.businessName?.message}>
          <input {...register("businessName")} type="text" placeholder="Brenner Precision Machining" className="input-base" />
        </Field>

        <Field label="Trade / Industry" error={errors.vertical?.message}>
          <select {...register("vertical")} className="input-base">
            <option value="">Select your trade…</option>
            {VERTICALS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="10+ characters"
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-soft"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {errors.root && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account…" : "Create account"}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-bright hover:text-amber">Sign in</Link>
      </p>
    </motion.div>
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
