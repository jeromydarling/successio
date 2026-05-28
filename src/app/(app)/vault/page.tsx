"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, FileText, FileSpreadsheet, FileAudio, Image, File } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { DocumentSlideOver } from "@/components/vault/document-slide-over";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:         FileText,
  spreadsheet: FileSpreadsheet,
  image:       Image,
  audio:       FileAudio,
};

const STATUS_FILTERS = [
  "all", "complete", "needs_review", "extracting", "queued", "failed",
] as const;

export default function VaultPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = trpc.documents.list.useQuery({ limit: 100 });

  const filtered = docs.filter((d) => {
    const matchSearch = d.originalName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <AppTopNav title="Document Vault" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Search + filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="input-base pl-10"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    statusFilter === s
                      ? "border-amber/40 bg-amber/10 text-amber-bright"
                      : "border-edge text-ink-soft hover:border-edge-strong hover:text-ink"
                  )}
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="mx-auto size-10 text-ink-faint" />
              <p className="mt-3 text-sm text-ink-soft">
                {search ? "No documents match your search" : "No documents yet — go upload!"}
              </p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              {filtered.map((doc) => {
                const Icon = FILE_ICONS[doc.fileType ?? ""] ?? File;
                return (
                  <motion.article
                    key={doc.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="group cursor-pointer rounded-xl border border-edge bg-canvas-soft/40 p-4 transition-colors hover:border-amber/30 hover:bg-canvas-soft/60"
                  >
                    <Icon className="size-7 text-amber/70" />
                    <p className="mt-3 truncate text-sm font-medium text-ink">
                      {doc.originalName}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusPill status={doc.status} />
                      {doc.ocrConfidence != null && (
                        <span className="font-mono text-[11px] text-ink-faint">
                          {Math.round(doc.ocrConfidence * 100)}%
                        </span>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>

      <DocumentSlideOver
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
      />
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete:     "bg-emerald-500/10 text-emerald-400",
    needs_review: "bg-orange-500/10 text-orange-400",
    extracting:   "bg-amber/10 text-amber",
    ocr:          "bg-sky-500/10 text-sky-400",
    embedding:    "bg-violet-500/10 text-violet-400",
    queued:       "bg-white/5 text-ink-faint",
    failed:       "bg-red-500/10 text-red-400",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", map[status] ?? "bg-white/5 text-ink-faint")}>
      {status.replace("_", " ")}
    </span>
  );
}
