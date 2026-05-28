/**
 * Tiny cryptographically-random ID generator.
 * Works in both Cloudflare Workers (workerd) and Node.js runtimes.
 * Length 21 = ~126 bits entropy. Safe to use as database primary key.
 */
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(len = 21): string {
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) id += CHARS[b % CHARS.length];
  return id;
}
