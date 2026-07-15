// NOTE: uploads/downloads go through the R2 binding (POST /api/upload streams
// bytes via the Worker) — there are deliberately no presigned-URL helpers here.
// R2Bucket has no createPresignedUrl API; presigning requires the S3-compat
// endpoint + aws4fetch (see r2-presign.ts if that route is ever needed).

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
