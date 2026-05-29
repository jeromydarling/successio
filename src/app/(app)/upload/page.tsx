"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { DocumentConnectors } from "@/components/upload/connectors";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

type FileStatus = "pending" | "uploading" | "queued" | "error";

interface UploadFile {
  file: File;
  id: string;
  status: FileStatus;
  progress: number;
  error?: string;
  documentId?: string;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const requestUpload = trpc.documents.requestUpload.useMutation();
  const confirmUpload = trpc.documents.confirmUpload.useMutation();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const newEntries: UploadFile[] = accepted.map((f) => ({
        file: f,
        id: crypto.randomUUID(),
        status: "pending",
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newEntries]);

      for (const entry of newEntries) {
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: "uploading", progress: 10 } : f
            )
          );

          const { documentId } = await requestUpload.mutateAsync({
            filename: entry.file.name,
            mimeType: entry.file.type || "application/octet-stream",
            sizeBytes: entry.file.size,
          });

          // Upload through the Worker (writes to R2 via the binding — no S3 creds).
          const res = await fetch(`/api/upload?documentId=${encodeURIComponent(documentId)}`, {
            method: "POST",
            body: entry.file,
            headers: { "Content-Type": entry.file.type || "application/octet-stream" },
          });
          if (!res.ok) throw new Error(`Upload failed (${res.status})`);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, progress: 80, documentId } : f
            )
          );

          await confirmUpload.mutateAsync({ documentId });

          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: "queued", progress: 100 } : f
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id ? { ...f, status: "error", error: msg } : f
            )
          );
        }
      }
    },
    [requestUpload, confirmUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [],
      "image/*": [],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
      "application/vnd.ms-excel": [],
      "text/csv": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
      "audio/*": [],
    },
    maxSize: 200 * 1024 * 1024,
  });

  const remove = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <>
      <AppTopNav title="Upload Documents" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-6">
            <h2 className="text-lg font-semibold text-ink">Add your documents</h2>
            <p className="mt-1 text-sm text-ink-soft">
              PDFs, images, spreadsheets, Word docs, voice memos — anything goes in. Max 200 MB per file.
            </p>

            {/* Drop zone: regular div for dropzone, motion.div for animation wrapping */}
            <motion.div
              animate={isDragActive ? { scale: 1.01 } : { scale: 1 }}
              className="mt-5"
            >
              <div
                {...getRootProps()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-14 transition-colors",
                  isDragActive
                    ? "border-amber/50 bg-amber/[0.04]"
                    : "border-edge hover:border-edge-strong hover:bg-white/[0.02]"
                )}
              >
              <input {...getInputProps()} />
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber/10 ring-1 ring-amber/20">
                <Upload className="size-6 text-amber" />
              </div>
              <p className="mt-4 text-base font-medium text-ink">
                {isDragActive ? "Drop it here" : "Drag files here, or click to browse"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Work orders, P&amp;Ls, customer lists, equipment ledgers, voice notes
              </p>
              </div>
            </motion.div>

            {/* Cloud storage connectors */}
            <DocumentConnectors />
          </div>

          {/* File list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                {files.map((f) => (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-3 rounded-xl border border-edge bg-canvas-soft/40 px-4 py-3"
                  >
                    <FileText className="size-4 shrink-0 text-ink-faint" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{f.file.name}</p>
                      {f.status === "uploading" && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-amber"
                            animate={{ width: `${f.progress}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      )}
                      {f.error && (
                        <p className="mt-0.5 text-xs text-red-400">{f.error}</p>
                      )}
                    </div>
                    <StatusIcon status={f.status} />
                    {f.status !== "uploading" && (
                      <button
                        onClick={() => remove(f.id)}
                        className="ml-1 text-ink-faint hover:text-ink-soft"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Tips */}
          <div className="rounded-xl border border-edge bg-canvas-soft/30 p-5">
            <h3 className="text-sm font-semibold text-ink">What makes a good upload?</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {[
                "3+ years of P&L statements (the higher the confidence, the better your score)",
                "Customer list — even a spreadsheet with names and rough revenue",
                "Equipment ledger or recent appraisal",
                "Any certifications or compliance documents (ISO, safety, trade licenses)",
                "Work order templates or SOP documents",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber/60" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "uploading": return <Loader2 className="size-4 animate-spin text-amber" />;
    case "queued":   return <CheckCircle className="size-4 text-emerald-400" />;
    case "error":    return <AlertCircle className="size-4 text-red-400" />;
    default:         return null;
  }
}
