"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, ClipboardList, ChevronRight } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Per-vertical prompted interview questions (stub set for Phase 1 — Phase 4 fleshes this out)
const PROMPTS = [
  "How do you quote a job from scratch?",
  "Who are your three most important customers, and why do they keep coming back?",
  "What breaks most often — and how do you fix it?",
  "If you were gone for a month, what would go wrong first?",
  "What's the most important thing a new owner would need to know on day one?",
];

type RecordingState = "idle" | "recording" | "processing" | "done";

export default function KnowledgePage() {
  const [recState, setRecState] = useState<RecordingState>("idle");
  const [activePrompt, setActivePrompt] = useState(0);

  const toggleRecording = () => {
    if (recState === "idle") {
      setRecState("recording");
    } else if (recState === "recording") {
      setRecState("processing");
      setTimeout(() => setRecState("done"), 1800); // Phase 4: real Whisper pipeline
    }
  };

  return (
    <>
      <AppTopNav title="Knowledge Capture" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Voice capture */}
          <section className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
            <h2 className="text-lg font-semibold text-ink">Speak your expertise</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Hit record and answer a question out loud. We transcribe it, then Claude drafts a clean SOP card you can edit.
            </p>

            {/* Prompted question */}
            <div className="mt-5 rounded-xl border border-amber/20 bg-amber/[0.04] p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-amber mb-2">Prompt</p>
              <p className="text-base text-ink">{PROMPTS[activePrompt]}</p>
            </div>

            {/* Mic button */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <motion.button
                onClick={toggleRecording}
                animate={recState === "recording" ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={cn(
                  "flex size-20 items-center justify-center rounded-full border-2 transition-all duration-200",
                  recState === "recording"
                    ? "border-red-500 bg-red-500/10 shadow-[0_0_0_8px_rgba(239,68,68,0.1)]"
                    : "border-edge bg-white/[0.03] hover:border-edge-strong"
                )}
              >
                {recState === "recording" ? (
                  <MicOff className="size-7 text-red-400" />
                ) : (
                  <Mic className="size-7 text-ink-soft" />
                )}
              </motion.button>

              <p className="text-sm text-ink-soft">
                {recState === "idle" && "Tap to start recording"}
                {recState === "recording" && <span className="text-red-400">Recording… tap to stop</span>}
                {recState === "processing" && "Transcribing with Whisper…"}
                {recState === "done" && <span className="text-emerald-400">Transcribed! Review the card below.</span>}
              </p>
            </div>

            {/* Navigate prompts */}
            <div className="mt-5 flex items-center justify-between border-t border-edge pt-4">
              <button
                onClick={() => setActivePrompt((p) => Math.max(0, p - 1))}
                disabled={activePrompt === 0}
                className="text-xs text-ink-soft hover:text-ink disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="font-mono text-xs text-ink-faint">
                {activePrompt + 1} / {PROMPTS.length}
              </span>
              <button
                onClick={() => setActivePrompt((p) => Math.min(PROMPTS.length - 1, p + 1))}
                disabled={activePrompt === PROMPTS.length - 1}
                className="text-xs text-ink-soft hover:text-ink disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </section>

          {/* SOP stubs — Phase 4 populates these from real voice capture */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Your SOPs</h3>
            <div className="rounded-xl border border-dashed border-edge py-12 text-center">
              <ClipboardList className="mx-auto size-9 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-soft">No SOPs captured yet</p>
              <p className="mt-1 text-xs text-ink-faint">Use voice capture above or upload a Word/PDF document</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
