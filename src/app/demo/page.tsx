"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Factory, Building2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

type Persona = "owner" | "association";

const PERSONAS: {
  key: Persona;
  icon: typeof Factory;
  title: string;
  who: string;
  blurb: string;
  bullets: string[];
}[] = [
  {
    key: "owner",
    icon: Factory,
    title: "Explore as a business owner",
    who: "Carl Brenner · Brenner Precision Machining",
    blurb:
      "A 38-year machine shop in Akron getting ready to sell. See the owner's side: upload documents, watch the readiness score build, browse the deal room, and read the keepsake Legacy Book.",
    bullets: ["Readiness dashboard", "Document vault & history", "Deal room", "Legacy Book"],
  },
  {
    key: "association",
    icon: Building2,
    title: "Explore as an association",
    who: "Heartland Tooling Alliance · 6 member businesses",
    blurb:
      "A trade alliance helping its members retire well. See the portfolio view: every member's readiness, who's at risk, aggregate lift, and the books you can gift retiring owners.",
    bullets: ["Member portfolio", "Readiness distribution", "At-risk flags", "Gift a Legacy Book"],
  },
];

export default function DemoPage() {
  const [pending, setPending] = useState<Persona | null>(null);

  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: (data) => {
      // Session cookie is set by the server (Set-Cookie); full navigation so it
      // is sent on the document request.
      window.location.href = data.redirect;
    },
    onError: () => setPending(null),
  });

  const enter = (persona: Persona) => {
    setPending(persona);
    demoLogin.mutate({ persona });
  };

  return (
    <main className="relative min-h-screen pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-grid bg-grid-fade" />

      <div className="sticky top-0 z-40 border-b border-edge bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <span className="font-mono text-xs text-ink-faint">live demo</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5">
        <header className="pt-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              Try it with real data
            </span>
            <h1 className="mx-auto mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Step into the live product
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-ink-soft">
              No signup. Pick a seat below and you&apos;ll land inside the real
              app, pre-loaded with a demo business and its trade association.
            </p>
          </motion.div>
        </header>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PERSONAS.map((p, i) => {
            const isPending = pending === p.key;
            const Icon = p.icon;
            return (
              <motion.button
                key={p.key}
                type="button"
                onClick={() => enter(p.key)}
                disabled={pending !== null}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group flex flex-col rounded-2xl border border-edge bg-canvas-soft/60 p-7 text-left transition-all duration-200",
                  "hover:border-amber/40 hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60",
                  isPending && "border-amber/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-amber/10 ring-1 ring-amber/30">
                    <Icon className="size-6 text-amber" />
                  </span>
                  {isPending ? (
                    <Loader2 className="size-5 animate-spin text-amber" />
                  ) : (
                    <ArrowRight className="size-5 text-ink-faint transition-all duration-200 group-hover:translate-x-1 group-hover:text-amber" />
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">{p.title}</h2>
                <p className="mt-1 font-mono text-xs text-ink-faint">{p.who}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.blurb}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {p.bullets.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-edge px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                    >
                      {b}
                    </span>
                  ))}
                </div>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-amber-bright">
                  {isPending ? "Signing you in…" : "Enter the demo"}
                </span>
              </motion.button>
            );
          })}
        </div>

        {demoLogin.isError && (
          <p className="mt-6 text-center text-sm text-red-400">
            The demo isn&apos;t available right now. Please try again shortly.
          </p>
        )}

        <p className="mx-auto mt-10 max-w-md text-center text-xs text-ink-faint">
          This is a shared demo environment with sample data. Want your own?{" "}
          <Link href="/signup" className="text-ink-soft underline-offset-4 hover:underline">
            Create an account
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
