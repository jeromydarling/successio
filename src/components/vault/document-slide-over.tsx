"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight,
  Users,
  Wrench,
  BarChart3,
  UserCheck,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc-client";

interface Props {
  documentId: string | null;
  onClose: () => void;
}

const ENTITY_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  customer:  { label: "Customers",  Icon: Users,      color: "text-sky-400" },
  equipment: { label: "Equipment",  Icon: Wrench,     color: "text-amber" },
  financial: { label: "Financials", Icon: BarChart3,  color: "text-emerald-400" },
  employee:  { label: "Employees",  Icon: UserCheck,  color: "text-violet-400" },
  process:   { label: "Processes",  Icon: GitBranch,  color: "text-orange-400" },
  milestone: { label: "Milestones", Icon: ChevronRight, color: "text-pink-400" },
};

export function DocumentSlideOver({ documentId, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.documents.getDetail.useQuery(
    { id: documentId! },
    { enabled: !!documentId }
  );
  const markReviewed = trpc.documents.markReviewed.useMutation({
    onSuccess: () => {
      utils.documents.getDetail.invalidate({ id: documentId! });
      utils.documents.list.invalidate();
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (documentId) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [documentId]);

  return (
    <AnimatePresence>
      {documentId && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-canvas border-l border-edge shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-edge p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  Document Detail
                </p>
                <h2 className="mt-0.5 truncate text-base font-semibold text-ink">
                  {isLoading ? (
                    <span className="inline-block h-4 w-48 animate-pulse rounded bg-white/10" />
                  ) : (
                    data?.doc.originalName
                  )}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-white/5 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : data ? (
                <>
                  <MetaGrid doc={data.doc} />
                  {data.doc.status === "needs_review" && (
                    <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-4 shrink-0 text-orange-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink">Some extractions need your eyes</p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                            The AI wasn&apos;t fully confident about some of the data below. Check it —
                            fix anything wrong on the Business Data page — then confirm.
                          </p>
                          <button
                            onClick={() => markReviewed.mutate({ documentId: documentId! })}
                            disabled={markReviewed.isPending}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/25 disabled:opacity-50"
                          >
                            <CheckCircle2 className="size-3.5" />
                            {markReviewed.isPending ? "Confirming…" : "Looks right — mark reviewed"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <EntityList entities={data.entities} />
                  {data.doc.ocrText && <OcrSection text={data.doc.ocrText} />}
                </>
              ) : (
                <p className="text-sm text-ink-soft">Failed to load document details.</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-sections ──────────────────────────────────────────────────────────────

interface DocRecord {
  id?: string;
  originalName: string;
  status: string;
  fileType?: string | null;
  documentType?: string | null;
  ocrConfidence?: number | null;
  sizeBytes: number;
  createdAt?: Date | number | string | null;
  errorMessage?: string | null;
}

function MetaGrid({ doc }: { doc: DocRecord }) {
  const items = [
    { label: "Status",    value: <StatusChip status={doc.status} /> },
    { label: "File type", value: doc.fileType ?? "—" },
    { label: "Doc type",  value: doc.documentType ?? "—" },
    { label: "OCR conf.", value: doc.ocrConfidence != null ? `${Math.round(doc.ocrConfidence * 100)}%` : "—" },
    { label: "Size",      value: doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—" },
    { label: "Uploaded",  value: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <SectionTitle>Metadata</SectionTitle>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {doc.errorMessage && (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
          <p className="text-xs text-red-300">{doc.errorMessage}</p>
        </div>
      )}
      {doc.id && (
        <a
          href={`/api/document-file/${doc.id}?download=1`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber/80 hover:text-amber"
        >
          <FileText className="size-3.5" />
          Download original file
        </a>
      )}
    </div>
  );
}

function EntityList({ entities }: { entities: Array<{ id: string; entityType: string; data: string; confidence: number; needsReview: boolean }> }) {
  if (entities.length === 0) {
    return (
      <div>
        <SectionTitle>Extracted Entities</SectionTitle>
        <p className="mt-2 text-sm text-ink-faint">No entities extracted yet.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Extracted Entities</SectionTitle>
      <div className="mt-3 space-y-3">
        {entities.map((entity) => {
          const meta = ENTITY_META[entity.entityType] ?? { label: entity.entityType, Icon: FileText, color: "text-ink-soft" };
          const items = parseItems(entity.data);
          return (
            <div key={entity.id} className="rounded-xl border border-edge bg-canvas-soft/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <meta.Icon className={cn("size-4", meta.color)} />
                  <span className="text-sm font-medium text-ink">{meta.label}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-faint">
                    {items.length}
                  </span>
                </div>
                <ConfidenceBadge value={entity.confidence} needsReview={entity.needsReview} />
              </div>
              <ul className="space-y-1.5">
                {items.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-soft">
                    <span className="mt-0.5 font-mono text-[10px] text-ink-faint shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{summariseItem(item)}</span>
                  </li>
                ))}
                {items.length > 5 && (
                  <li className="text-xs text-ink-faint">+{items.length - 5} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OcrSection({ text }: { text: string }) {
  return (
    <div>
      <SectionTitle>Raw OCR Text</SectionTitle>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-edge bg-canvas-soft/30 p-4">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-soft">
          {text}
        </pre>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{children}</h3>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete:     "text-emerald-400",
    needs_review: "text-orange-400",
    extracting:   "text-amber",
    ocr:          "text-sky-400",
    embedding:    "text-violet-400",
    queued:       "text-ink-faint",
    failed:       "text-red-400",
  };
  return (
    <span className={cn("text-sm font-medium capitalize", map[status] ?? "text-ink-soft")}>
      {status.replace("_", " ")}
    </span>
  );
}

function ConfidenceBadge({ value, needsReview }: { value: number; needsReview: boolean }) {
  const pct = Math.round(value * 100);
  if (needsReview) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400">
        <AlertTriangle className="size-3" />
        {pct}% — review
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
      <CheckCircle2 className="size-3" />
      {pct}%
    </span>
  );
}

function parseItems(data: string): unknown[] {
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function summariseItem(item: unknown): string {
  if (typeof item !== "object" || item === null) return String(item);
  const obj = item as Record<string, unknown>;
  // Try common name fields
  const name = obj.name ?? obj.title ?? obj.year ?? obj.role;
  if (name) return String(name);
  return Object.entries(obj).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
      ))}
    </div>
  );
}
