"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Edit3, Check, Trash2, Plus, GripVertical, User, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc-client";
import { useTranslate, TranslateMenu } from "@/components/shared/translate";

interface SopCardProps {
  id: string;
  title: string;
  steps: string[];
  owner?: string | null;
  source?: string | null;
  onDeleted?: () => void;
}

export function SopCard({ id, title, steps, owner, source, onDeleted }: SopCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editSteps, setEditSteps] = useState(steps);
  const utils = trpc.useUtils();

  // On-demand translation of the title + steps as one aligned batch.
  const t = useTranslate([title, ...steps]);
  const shownTitle = t.lang ? t.display[0] : title;
  const shownSteps = t.lang ? t.display.slice(1) : steps;

  const updateMutation = trpc.knowledge.updateSop.useMutation({
    onSuccess: () => {
      utils.knowledge.listSops.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.knowledge.deleteSop.useMutation({
    onSuccess: () => {
      utils.knowledge.listSops.invalidate();
      onDeleted?.();
    },
  });

  const save = () => {
    updateMutation.mutate({ id, title: editTitle, steps: editSteps.filter(Boolean) });
  };

  const cancel = () => {
    setEditTitle(title);
    setEditSteps(steps);
    setEditing(false);
  };

  const addStep = () => setEditSteps((s) => [...s, ""]);

  const updateStep = (i: number, val: string) =>
    setEditSteps((s) => s.map((x, idx) => (idx === i ? val : x)));

  const removeStep = (i: number) =>
    setEditSteps((s) => s.filter((_, idx) => idx !== i));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border border-edge bg-canvas-soft/40 p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-base flex-1 text-sm font-semibold"
          />
        ) : (
          <h4 className="text-sm font-semibold text-ink">{shownTitle}</h4>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {!editing && (
            <TranslateMenu lang={t.lang} isPending={t.isPending} onChoose={t.choose} />
          )}
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={updateMutation.isPending}
                className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={cancel}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-white/5 hover:text-ink"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-white/5 hover:text-ink"
              >
                <Edit3 className="size-4" />
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id })}
                disabled={deleteMutation.isPending}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Source badge */}
      {source && (
        <span className={cn(
          "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
          source === "voice" ? "bg-violet-500/10 text-violet-400"
            : source === "manual" ? "bg-sky-500/10 text-sky-400"
            : "bg-amber/10 text-amber"
        )}>
          {source}
        </span>
      )}

      {/* Steps */}
      <ol className="mt-3 space-y-2">
        {(editing ? editSteps : shownSteps).map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber/10 font-mono text-[10px] font-semibold text-amber">
              {i + 1}
            </span>
            {editing ? (
              <div className="flex flex-1 items-center gap-1.5">
                <input
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="input-base flex-1 text-xs"
                  placeholder={`Step ${i + 1}`}
                />
                <button
                  onClick={() => removeStep(i)}
                  className="shrink-0 text-ink-faint hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-ink-soft">{step}</span>
            )}
          </li>
        ))}
      </ol>

      {editing && (
        <button
          onClick={addStep}
          className="mt-2 flex items-center gap-1.5 text-xs text-amber hover:text-amber-bright"
        >
          <Plus className="size-3.5" /> Add step
        </button>
      )}

      {/* Owner */}
      {owner && !editing && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
          <User className="size-3" /> {owner}
        </div>
      )}
    </motion.div>
  );
}
