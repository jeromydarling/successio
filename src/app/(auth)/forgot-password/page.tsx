"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MailCheck } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const mutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-edge bg-canvas-soft/70 p-8 backdrop-blur-xl"
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber/10 ring-1 ring-amber/30">
            <MailCheck className="size-6 text-amber" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Check your email</h1>
          <p className="mt-2 text-sm text-ink-soft">
            If an account exists for <span className="text-ink">{email}</span>, we&apos;ve sent a link to
            reset your password. It expires in 1 hour.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-amber-bright hover:text-amber">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) mutation.mutate({ email });
            }}
            className="mt-8 space-y-5"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink-soft">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="owner@brennermachining.com"
                className="input-base"
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending || !email}>
              {mutation.isPending ? "Sending…" : "Send reset link"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-soft">
            Remembered it?{" "}
            <Link href="/login" className="text-amber-bright hover:text-amber">
              Sign in
            </Link>
          </p>
        </>
      )}
    </motion.div>
  );
}
