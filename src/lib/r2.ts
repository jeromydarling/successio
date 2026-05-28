import type { Env } from "./env";

/**
 * Generates a presigned PUT URL for direct-from-browser R2 upload.
 * The client uploads straight to R2 — the Worker never proxies the file bytes.
 */
export async function generateUploadUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const url = await (bucket as any).createPresignedUrl("PUT", key, {
    expiresIn: expiresInSeconds,
  });
  return url;
}

/**
 * Generate a presigned GET URL for serving a document to an authenticated user.
 */
export async function generateDownloadUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const url = await (bucket as any).createPresignedUrl("GET", key, {
    expiresIn: expiresInSeconds,
  });
  return url;
}

/**
 * Build the R2 object key for a document upload.
 * Pattern: orgs/{orgId}/documents/{documentId}/{filename}
 */
export function documentKey(
  orgId: string,
  documentId: string,
  filename: string
): string {
  // Sanitize filename to prevent path traversal
  const safe = filename.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
  return `orgs/${orgId}/documents/${documentId}/${safe}`;
}

/**
 * Detect broad file type from mime type.
 */
export function detectFileType(
  mimeType: string
): "pdf" | "image" | "spreadsheet" | "docx" | "audio" | "unknown" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "text/csv"
  )
    return "spreadsheet";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/"))
    return "audio";
  return "unknown";
}
