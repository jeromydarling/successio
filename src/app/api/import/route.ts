/**
 * POST /api/import — import files chosen from a cloud connector.
 *
 * The browser uses each provider's native picker, which yields either a
 * pre-authenticated download URL (Dropbox, OneDrive, SharePoint) or a file id +
 * short-lived access token (Google Drive). This route fetches the bytes
 * server-side and runs them through the normal ingest pipeline. No provider
 * secrets are stored — only the public client IDs the picker needs.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { verifySession, getTokenFromCookie } from "@/lib/auth";
import { ingestDocument } from "@/lib/ingest";

const MAX_FILES = 25;
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB per file

type Provider = "dropbox" | "google" | "onedrive" | "sharepoint";
interface ImportFile {
  name: string;
  mimeType?: string;
  url?: string; // pre-authenticated download URL (dropbox / microsoft)
  id?: string; // file id (google)
}
interface ImportBody {
  provider: Provider;
  accessToken?: string; // google only
  files: ImportFile[];
}

/** Google Workspace native types must be exported to a real file format. */
function googleExportType(mimeType: string): string | null {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return "application/pdf";
    case "application/vnd.google-apps.presentation":
      return "application/pdf";
    case "application/vnd.google-apps.spreadsheet":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "application/vnd.google-apps.drawing":
      return "image/png";
    default:
      return null;
  }
}

async function fetchFile(
  provider: Provider,
  file: ImportFile,
  accessToken: string | undefined
): Promise<{ name: string; mimeType: string; bytes: ArrayBuffer }> {
  // Google Drive: download (or export native docs) via the Drive API.
  if (provider === "google") {
    if (!file.id || !accessToken) throw new Error("Missing file id or access token");
    const exportType = file.mimeType ? googleExportType(file.mimeType) : null;
    const url = exportType
      ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportType)}`
      : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Google download failed (${res.status})`);
    const bytes = await res.arrayBuffer();
    let name = file.name;
    let mimeType = exportType ?? file.mimeType ?? res.headers.get("content-type") ?? "application/octet-stream";
    if (exportType === "application/pdf" && !/\.pdf$/i.test(name)) name += ".pdf";
    if (exportType?.includes("spreadsheetml") && !/\.xlsx$/i.test(name)) name += ".xlsx";
    return { name, mimeType, bytes };
  }

  // Dropbox / OneDrive / SharePoint: pre-authenticated direct URL.
  if (!file.url) throw new Error("Missing download URL");
  const res = await fetch(file.url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const bytes = await res.arrayBuffer();
  const mimeType = file.mimeType || res.headers.get("content-type") || "application/octet-stream";
  return { name: file.name, mimeType, bytes };
}

export async function POST(req: Request): Promise<Response> {
  // Same-origin guard (SameSite=Strict cookie already blocks cross-site).
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return new Response("Forbidden", { status: 403 });
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext()).env as Record<string, unknown>;
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }
  const e = env as unknown as {
    DB: D1Database;
    DOCUMENTS: R2Bucket;
    DOCUMENT_QUEUE?: Queue;
    JWT_SECRET: string;
  };

  const session = await verifySession(getTokenFromCookie(req.headers.get("cookie")) ?? "", e.JWT_SECRET);
  if (!session) return new Response("Unauthorized", { status: 401 });

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return new Response("Invalid body", { status: 400 });
  }
  if (!body?.provider || !Array.isArray(body.files) || body.files.length === 0) {
    return new Response("No files", { status: 400 });
  }

  const db = drizzle(e.DB, { schema });
  const files = body.files.slice(0, MAX_FILES);
  const results: { name: string; ok: boolean; documentId?: string; error?: string }[] = [];

  for (const f of files) {
    try {
      const { name, mimeType, bytes } = await fetchFile(body.provider, f, body.accessToken);
      if (bytes.byteLength === 0) throw new Error("Empty file");
      if (bytes.byteLength > MAX_BYTES) throw new Error("File too large (100 MB max)");
      const { documentId } = await ingestDocument(e, db, {
        orgId: session.orgId,
        uploadedBy: session.sub,
        filename: name,
        mimeType,
        bytes,
      });
      results.push({ name, ok: true, documentId });
    } catch (err) {
      results.push({ name: f.name, ok: false, error: err instanceof Error ? err.message : "Import failed" });
    }
  }

  return Response.json({ results });
}
