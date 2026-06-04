"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const mutation = trpc.auth.resetPassword.useMutation({ onSuccess: () => setDone(true) });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-edge bg-canvas-soft/70 p-8 backdrop-blur-xl"
    >
      {done ? (
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/30">
            <CheckCircle2 className="size-6 text-green-400" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Password updated</h1>
          <p className="mt-2 text-sm text-ink-soft">You can now sign in with your new password.</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button>Sign in <ArrowRight className="size-4" /></Button>
          </Link>
        </div>
      ) : !token ? (
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink">Invalid link</h1>
          <p className="mt-2 text-sm text-ink-soft">This reset link is missing its token. Request a new one.</p>
          <Link href="/forgot-password" className="mt-6 inline-block text-sm text-amber-bright hover:text-amber">
            Request a new link
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
          <p className="mt-1 text-sm text-ink-soft">At least 8 characters.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length >= 8) mutation.mutate({ token, password });
            }}
            className="mt-8 space-y-5"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-soft">New password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="input-base pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-soft"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {mutation.error && (
              <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{mutation.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending || password.length < 8}>
              {mutation.isPending ? "Updating…" : "Update password"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </>
      )}
    </motion.div>
  );
}
