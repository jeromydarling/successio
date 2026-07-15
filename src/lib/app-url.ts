/** Canonical base URL for links in emails and generated documents.
 *  APP_URL comes from wrangler.toml [vars]; the fallback keeps links working
 *  if the var is ever dropped in a new environment. */
export function appUrl(env: { APP_URL?: string }): string {
  return env.APP_URL || "https://successio.pro";
}
