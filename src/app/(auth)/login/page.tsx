"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc-client";
import { loginSchema, type LoginInput } from "@/types";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      router.push("/dashboard");
    },
    onError: (err) => {
      setError("root", { message: err.message });
    },
  });

  const onSubmit = (data: LoginInput) => loginMutation.mutate(data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-edge bg-canvas-soft/70 p-8 backdrop-blur-xl"
    >
      <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-soft">Sign in to your Successio account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <Field label="Email address" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="owner@brennermachining.com"
            className="input-base"
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        No account?{" "}
        <Link href="/signup" className="text-amber-bright hover:text-amber">
          Create one free
        </Link>
      </p>
    </motion.div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-soft">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
