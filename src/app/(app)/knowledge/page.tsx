"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, ClipboardList, RefreshCw, Save, RotateCcw,
  Plus, Search,
} from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { SopCard } from "@/components/knowledge/sop-card";
import { useMediaRecorder } from "@/hooks/use-media-recorder";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import { questionsForVertical } from "@/lib/interview-questions";

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Base64-encode bytes in chunks (avoids call-stack limits on large buffers). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function KnowledgePage() {
  const [activePrompt, setActivePrompt] = useState(0);
  const [search, setSearch] = useState("");

  // Voice capture state
  const recorder = useMediaRecorder();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; steps: string[]; owner?: string; notes?: string } | null>(null);
  const [editDraftTitle, setEditDraftTitle] = useState("");
  const [editDraftSteps, setEditDraftSteps] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const { data: sops = [], isLoading: sopsLoading } = trpc.knowledge.listSops.useQuery();
  const { data: org } = trpc.businesses.getOrg.useQuery();
  // Interview questions match the org's trade (falls back to manufacturing).
  const PROMPTS = questionsForVertical(org?.vertical);

  const processRecording = trpc.knowledge.processRecording.useMutation({
    onSuccess: (data) => {
      setTranscript(data.transcript);
      setDraft(data.sop);
      setEditDraftTitle(data.sop.title);
      setEditDraftSteps(data.sop.steps);
    },
  });
  const saveSop = trpc.knowledge.saveSop.useMutation({
    onSuccess: () => {
      utils.knowledge.listSops.invalidate();
      recorder.reset();
      setTranscript(null);
      setDraft(null);
    },
  });

  const handleStop = async () => {
    recorder.stop();
  };

  const handleProcess = async () => {
    if (!recorder.audioBlob) return;
    try {
      // Send the audio inline to the Worker (Whisper + SOP draft) — no R2 needed.
      const buf = await recorder.audioBlob.arrayBuffer();
      const audioBase64 = bytesToBase64(new Uint8Array(buf));
      await processRecording.mutateAsync({
        audioBase64,
        question: PROMPTS[activePrompt],
      });
    } catch {
      // Error surfaced via processRecording.error below.
    }
  };

  const handleSave = () => {
    saveSop.mutate({
      title: editDraftTitle,
      steps: editDraftSteps.filter(Boolean),
      source: "voice",
    });
  };

  const filteredSops = sops.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  const isProcessing = processRecording.isPending;
  const processingStage = processRecording.isPending ? "Transcribing & drafting…" : null;

  return (
    <>
      <AppTopNav title="Knowledge Capture" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Voice capture card */}
          <section className="rounded-2xl border border-edge bg-canvas-soft/50 p-7">
            <h2 className="text-lg font-semibold text-ink">Speak your expertise</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Answer a prompt out loud. We transcribe it, then Claude drafts a clean SOP you can edit and save.
            </p>

            {/* Prompted question */}
            <div className="mt-5 rounded-xl border border-amber/20 bg-amber/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2">Prompt</p>
              <p className="text-base text-ink">{PROMPTS[activePrompt]}</p>
            </div>

            {/* Mic + controls */}
            <div className="mt-6 flex flex-col items-center gap-4">
              {recorder.error && (
                <p className="text-sm text-red-400">{recorder.error}</p>
              )}
              {processRecording.error && (
                <p className="max-w-md text-center text-sm text-red-400">
                  {processRecording.error.message}
                </p>
              )}

              <AnimatePresence mode="wait">
                {recorder.state === "idle" && (
                  <motion.button
                    key="idle"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={recorder.start}
                    className="flex size-20 items-center justify-center rounded-full border-2 border-edge bg-white/[0.03] hover:border-edge-strong transition-all"
                  >
                    <Mic className="size-7 text-ink-soft" />
                  </motion.button>
                )}

                {recorder.state === "recording" && (
                  <motion.button
                    key="recording"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={handleStop}
                    className="flex size-20 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/10 shadow-[0_0_0_8px_rgba(239,68,68,0.08)] transition-all hover:shadow-[0_0_0_12px_rgba(239,68,68,0.12)]"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      <MicOff className="size-7 text-red-400" />
                    </motion.div>
                  </motion.button>
                )}

                {recorder.state === "stopped" && !draft && (
                  <motion.div
                    key="stopped"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        size="sm"
                      >
                        {isProcessing ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                        {processingStage ?? "Transcribe & generate SOP"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={recorder.reset}
                        disabled={isProcessing}
                      >
                        <RotateCcw className="size-4" /> Discard
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-sm text-ink-soft text-center">
                {recorder.state === "idle" && "Tap to start recording"}
                {recorder.state === "recording" && (
                  <span className="font-mono text-red-400">
                    ● Recording {formatDuration(recorder.durationSecs)} — tap to stop
                  </span>
                )}
                {recorder.state === "stopped" && !isProcessing && !draft && "Recording ready — transcribe to continue"}
                {isProcessing && <span className="text-amber">{processingStage}</span>}
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

          {/* Draft SOP review */}
          <AnimatePresence>
            {draft && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-amber/30 bg-amber/[0.03] p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Draft SOP — review before saving</h3>
                  <button onClick={() => { setDraft(null); recorder.reset(); }}
                    className="text-xs text-ink-faint hover:text-ink">Discard</button>
                </div>

                {/* Transcript */}
                {transcript && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Transcript</p>
                    <p className="rounded-lg border border-edge bg-canvas-soft/30 p-3 text-xs italic leading-relaxed text-ink-soft">
                      {transcript}
                    </p>
                  </div>
                )}

                {/* Editable title */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Title</label>
                  <input
                    value={editDraftTitle}
                    onChange={(e) => setEditDraftTitle(e.target.value)}
                    className="input-base text-sm font-medium"
                  />
                </div>

                {/* Editable steps */}
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Steps</label>
                  <ol className="space-y-2">
                    {editDraftSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber/10 font-mono text-[10px] font-semibold text-amber">
                          {i + 1}
                        </span>
                        <input
                          value={step}
                          onChange={(e) => setEditDraftSteps((s) => s.map((x, idx) => idx === i ? e.target.value : x))}
                          className="input-base flex-1 text-xs"
                        />
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => setEditDraftSteps((s) => [...s, ""])}
                    className="mt-2 flex items-center gap-1.5 text-xs text-amber hover:text-amber-bright"
                  >
                    <Plus className="size-3.5" /> Add step
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saveSop.isPending}
                    size="sm"
                  >
                    <Save className="size-4" /> Save SOP
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDraft(null); recorder.reset(); }}
                  >
                    Discard
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Add manual SOP */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Your SOPs</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveSop.mutate({ title: "New SOP", steps: ["Step 1"], source: "manual" })}
            >
              <Plus className="size-4" /> Add manually
            </Button>
          </div>

          {/* Search */}
          {sops.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SOPs…"
                className="input-base pl-10"
              />
            </div>
          )}

          {/* SOP list */}
          {sopsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          ) : filteredSops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge py-12 text-center">
              <ClipboardList className="mx-auto size-9 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-soft">No SOPs captured yet</p>
              <p className="mt-1 text-xs text-ink-faint">Use voice capture above or click "Add manually"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredSops.map((sop) => (
                  <SopCard
                    key={sop.id}
                    id={sop.id}
                    title={sop.title}
                    steps={sop.steps}
                    owner={sop.owner}
                    source={sop.source}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
