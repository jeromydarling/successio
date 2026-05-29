"use client";

import { useState } from "react";
import { Cloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Dropbox?: any;
    gapi?: any;
    google?: any;
    OneDrive?: any;
  }
}

type Provider = "dropbox" | "google" | "onedrive" | "sharepoint";
interface PickedFile { name: string; mimeType?: string; url?: string; id?: string }

/** Load a <script> once (deduped by src). */
function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (attrs) for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

export function DocumentConnectors({ onImported }: { onImported?: (count: number) => void }) {
  const { data: connectors, isLoading } = trpc.config.connectors.useQuery(undefined, { staleTime: Infinity });
  const utils = trpc.useUtils();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [status, setStatus] = useState<{ kind: "info" | "ok" | "error"; msg: string } | null>(null);

  const runImport = async (provider: Provider, files: PickedFile[], accessToken?: string) => {
    if (files.length === 0) { setBusy(null); return; }
    setStatus({ kind: "info", msg: `Importing ${files.length} file${files.length > 1 ? "s" : ""}…` });
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, accessToken, files }),
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      const data = (await res.json()) as { results: { ok: boolean }[] };
      const ok = data.results.filter((r) => r.ok).length;
      const fail = data.results.length - ok;
      utils.documents.list.invalidate();
      onImported?.(ok);
      setStatus({
        kind: fail > 0 ? "error" : "ok",
        msg: fail > 0 ? `Imported ${ok}, ${fail} failed — they'll appear in your Vault.` : `Imported ${ok} — processing now. Check your Vault.`,
      });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(null);
    }
  };

  const openDropbox = async () => {
    const cfg = connectors?.dropbox;
    if (!cfg) return;
    setBusy("dropbox");
    try {
      await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
        id: "dropboxjs",
        "data-app-key": cfg.appKey,
      });
      window.Dropbox.choose({
        linkType: "direct",
        multiselect: true,
        success: (files: any[]) =>
          runImport("dropbox", files.map((f) => ({ name: f.name, url: f.link }))),
        cancel: () => setBusy(null),
      });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : "Dropbox failed to load" });
      setBusy(null);
    }
  };

  const openGoogle = async () => {
    const cfg = connectors?.google;
    if (!cfg) return;
    setBusy("google");
    try {
      await loadScript("https://apis.google.com/js/api.js");
      await loadScript("https://accounts.google.com/gsi/client");
      await new Promise<void>((res) => window.gapi.load("picker", () => res()));

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (resp: any) => {
          if (!resp?.access_token) { setBusy(null); return; }
          const token = resp.access_token;
          const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(false);
          const picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setDeveloperKey(cfg.apiKey)
            .setOAuthToken(token)
            .addView(view)
            .setCallback((data: any) => {
              if (data.action === window.google.picker.Action.PICKED) {
                runImport(
                  "google",
                  data.docs.map((d: any) => ({ name: d.name, id: d.id, mimeType: d.mimeType })),
                  token
                );
              } else if (data.action === window.google.picker.Action.CANCEL) {
                setBusy(null);
              }
            })
            .build();
          picker.setVisible(true);
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : "Google Drive failed to load" });
      setBusy(null);
    }
  };

  const openMicrosoft = async (provider: "onedrive" | "sharepoint") => {
    const cfg = connectors?.microsoft;
    if (!cfg) return;
    setBusy(provider);
    try {
      await loadScript("https://js.live.net/v7.2/OneDrive.js");
      window.OneDrive.open({
        clientId: cfg.clientId,
        action: "download",
        multiSelect: true,
        advanced: { redirectUri: window.location.origin },
        success: (resp: any) => {
          const files: PickedFile[] = (resp?.value ?? []).map((v: any) => ({
            name: v.name,
            url: v["@microsoft.graph.downloadUrl"] ?? v["@content.downloadUrl"],
            mimeType: v.file?.mimeType,
          }));
          runImport(provider, files);
        },
        cancel: () => setBusy(null),
        error: (e: any) => {
          setStatus({ kind: "error", msg: e?.message ?? "Microsoft picker error" });
          setBusy(null);
        },
      });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : "Microsoft picker failed to load" });
      setBusy(null);
    }
  };

  const sources: { key: Provider; label: string; configured: boolean; onClick: () => void }[] = [
    { key: "dropbox", label: "Dropbox", configured: !!connectors?.dropbox, onClick: openDropbox },
    { key: "google", label: "Google Drive", configured: !!connectors?.google, onClick: openGoogle },
    { key: "onedrive", label: "OneDrive", configured: !!connectors?.microsoft, onClick: () => openMicrosoft("onedrive") },
    { key: "sharepoint", label: "SharePoint", configured: !!connectors?.microsoft, onClick: () => openMicrosoft("sharepoint") },
  ];

  const anyConfigured = sources.some((s) => s.configured);

  return (
    <div className="mt-5 border-t border-edge pt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Import from cloud storage</p>
        {!isLoading && !anyConfigured && <span className="text-xs text-ink-faint">Setup pending</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sources.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={s.onClick}
            disabled={!s.configured || busy !== null}
            title={s.configured ? `Import from ${s.label}` : `${s.label} isn't set up yet`}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              s.configured
                ? "border-edge text-ink-soft hover:border-amber/40 hover:bg-amber/[0.04] hover:text-ink"
                : "cursor-not-allowed border-edge/60 text-ink-faint opacity-60",
              busy !== null && s.configured && "opacity-60"
            )}
          >
            {busy === s.key ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4 shrink-0" />}
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>

      {status && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2 text-sm",
            status.kind === "error" ? "text-red-400" : status.kind === "ok" ? "text-green-400" : "text-ink-soft"
          )}
        >
          {status.kind === "ok" ? <CheckCircle className="size-4" /> : status.kind === "error" ? <AlertCircle className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
          <span>{status.msg}</span>
        </div>
      )}

      {!isLoading && !anyConfigured && (
        <p className="mt-2 text-xs text-ink-faint">
          Connect Dropbox, Google Drive, OneDrive, or SharePoint to import documents without downloading them first.
        </p>
      )}
    </div>
  );
}
