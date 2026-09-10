/**
 * Application-layer field encryption — AES-256-GCM via WebCrypto.
 *
 * Why this exists on top of platform encryption: D1/R2 encrypt at rest, but
 * anyone with database access (a leaked token, a misconfigured backup) reads
 * plaintext. Encrypting the sensitive columns here means a database-level
 * breach yields ciphertext — the key lives in a Worker secret, not the DB.
 *
 * Key ring: the preferred key is ENCRYPTION_KEY. If it isn't set we derive a
 * key from JWT_SECRET (HKDF-SHA256) so encryption is live from day one with
 * zero ops. Every ciphertext is tagged with the id of the key that produced
 * it, so setting ENCRYPTION_KEY later never orphans old rows — decryption
 * picks the right key by id. Rotate by adding a new key; old ids keep working.
 *
 * Format: enc:v1:<kid>:<iv b64>:<ciphertext b64>
 * Values without the prefix are legacy plaintext and pass through unchanged.
 */

const PREFIX = "enc:v1:";
const HKDF_INFO = "successio-field-encryption-v1";

export interface CryptoEnv {
  ENCRYPTION_KEY?: string;
  JWT_SECRET?: string;
}

interface RingKey {
  kid: string;
  key: CryptoKey;
}

const ringCache = new Map<string, Promise<RingKey[]>>();

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importAesKey(raw: ArrayBuffer): Promise<RingKey> {
  const kid = hex(await crypto.subtle.digest("SHA-256", raw)).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return { kid, key };
}

/** Explicit secret of any length → 256-bit key (SHA-256). */
async function keyFromSecret(secret: string): Promise<RingKey> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return importAesKey(raw);
}

/** Derived fallback key from JWT_SECRET via HKDF — never the JWT key itself. */
async function keyFromJwtSecret(jwtSecret: string): Promise<RingKey> {
  const ikm = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    "HKDF",
    false,
    ["deriveBits"]
  );
  const raw = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("successio"),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    ikm,
    256
  );
  return importAesKey(raw);
}

/** Ordered key ring: [ENCRYPTION_KEY?, derived(JWT_SECRET)?]. First = encrypt key. */
function getRing(env: CryptoEnv): Promise<RingKey[]> {
  const cacheKey = `${env.ENCRYPTION_KEY ?? ""}|${env.JWT_SECRET ?? ""}`;
  let p = ringCache.get(cacheKey);
  if (!p) {
    p = (async () => {
      const ring: RingKey[] = [];
      if (env.ENCRYPTION_KEY) ring.push(await keyFromSecret(env.ENCRYPTION_KEY));
      if (env.JWT_SECRET) ring.push(await keyFromJwtSecret(env.JWT_SECRET));
      return ring;
    })();
    ringCache.set(cacheKey, p);
  }
  return p;
}

export function isEncrypted(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** True when a dedicated ENCRYPTION_KEY is configured (vs. the derived fallback). */
export function hasDedicatedKey(env: CryptoEnv): boolean {
  return !!env.ENCRYPTION_KEY;
}

/** Encrypt a string. Throws if no key material is available at all — we never
 *  silently store plaintext for a column that is supposed to be encrypted. */
export async function encryptField(env: CryptoEnv, plaintext: string): Promise<string> {
  const ring = await getRing(env);
  const k = ring[0];
  if (!k) throw new Error("[crypto] no encryption key material (set ENCRYPTION_KEY or JWT_SECRET)");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k.key,
    new TextEncoder().encode(plaintext)
  );
  return `${PREFIX}${k.kid}:${bytesToB64(iv)}:${bytesToB64(new Uint8Array(ct))}`;
}

/** Decrypt a stored value. Legacy plaintext (no prefix) is returned as-is. */
export async function decryptField(env: CryptoEnv, value: string): Promise<string> {
  if (!isEncrypted(value)) return value;
  const [kid, ivB64, ctB64] = value.slice(PREFIX.length).split(":");
  if (!kid || !ivB64 || !ctB64) throw new Error("[crypto] malformed ciphertext");
  const ring = await getRing(env);
  const k = ring.find((r) => r.kid === kid);
  if (!k) throw new Error(`[crypto] no key for kid ${kid} — was a key removed from the ring?`);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) },
    k.key,
    b64ToBytes(ctB64)
  );
  return new TextDecoder().decode(pt);
}

/** Null-tolerant decrypt for optional columns. */
export async function decryptNullable(
  env: CryptoEnv,
  value: string | null | undefined
): Promise<string | null> {
  if (value == null) return null;
  return decryptField(env, value);
}
