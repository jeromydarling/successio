/**
 * R2 presigned URL generation via the S3-compatible API.
 *
 * The native R2 binding (`R2Bucket`) does NOT expose `createPresignedUrl`, so
 * we sign requests against R2's S3 endpoint with SigV4 using `aws4fetch`.
 * The client then PUTs (upload) or GETs (download) the bytes directly to R2 —
 * the Worker never proxies file bodies.
 *
 * Requires R2 API token credentials (Account → R2 → Manage API tokens):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * plus the account id (CF_ACCOUNT_ID) and bucket name (R2_BUCKET_NAME).
 */

import { AwsClient } from "aws4fetch";

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface R2PresignEnv {
  CF_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

/** Pull R2 credentials from the Worker env, failing loudly if any are missing. */
export function r2CredentialsFromEnv(env: R2PresignEnv): R2Credentials {
  const accountId = env.CF_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME ?? "successio-documents";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "[r2-presign] Missing R2 credentials. Set CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/**
 * Generate a presigned URL for a direct browser ↔ R2 transfer.
 * Uses SigV4 query-string signing so the URL carries its own credentials.
 */
export async function presignR2Url(
  creds: R2Credentials,
  method: "PUT" | "GET",
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  // R2 S3 endpoint. Each path segment is encoded but slashes are preserved.
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://${creds.accountId}.r2.cloudflarestorage.com/${creds.bucket}/${encodedKey}`;

  const url = new URL(endpoint);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

  const signed = await client.sign(new Request(url, { method }), {
    aws: { signQuery: true },
  });

  return signed.url;
}
