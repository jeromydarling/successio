"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const token = useSearchParams().get("token") ?? "";
  const mutation = trpc.auth.verifyEmailToken.useMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      mutation.mutate({ token });
    }
  }, [token, mutation]);

  const state = !token
    ? "invalid"
    : mutation.isSuccess
    ? "ok"
    : mutation.isError
    ? "error"
    : "loading";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-edge bg-canvas-soft/70 p-8 text-center backdrop-blur-xl"
    >
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto size-8 animate-spin text-amber" />
          <h1 className="mt-5 text-xl font-semibold text-ink">Confirming your email…</h1>
        </>
      )}
      {state === "ok" && (
        <>
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/30">
            <CheckCircle2 className="size-6 text-green-400" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Email confirmed</h1>
          <p className="mt-2 text-sm text-ink-soft">Thanks — your email address is verified.</p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button>Go to dashboard</Button>
          </Link>
        </>
      )}
      {(state === "error" || state === "invalid") && (
        <>
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
            <XCircle className="size-6 text-red-400" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Link expired or invalid</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {mutation.error?.message ?? "This confirmation link can't be used."} You can request a new one from your settings.
          </p>
          <Link href="/settings" className="mt-6 inline-block text-sm text-amber-bright hover:text-amber">
            Go to settings
          </Link>
        </>
      )}
    </motion.div>
  );
}
