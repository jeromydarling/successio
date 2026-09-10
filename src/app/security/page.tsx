import { LegalPage } from "@/components/marketing/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Security",
  description:
    "How Successio protects the financial record of your business: double encryption, two-factor auth, device control, a full activity log, and data you can export or delete at any time.",
  path: "/security",
});

const BODY = `
You're trusting Successio with the financial record of a life's work. Here is plainly what protects it — written for owners, and detailed enough for a lender's vendor review. Every control on this page is real and in place today; nothing here is aspirational.

## Encrypted at rest — twice

The Service runs entirely on **Cloudflare's global platform** — application code on Cloudflare Workers, the database on Cloudflare D1, and files on Cloudflare R2. All customer data is **encrypted in transit (TLS everywhere)** and **encrypted at rest** by the platform.

On top of that, the most sensitive content is **encrypted again at the application layer** (AES-256-GCM) with a key that lives in a Worker secret, not in the database: the full text of every document, every extracted-record blob, every search chunk, and your two-factor secret. A breach of the database alone yields ciphertext. Keys are versioned so they can be rotated without re-encrypting history.

## Controls that are yours

Open **Settings → Security & privacy** in your account and you'll find:

- **Two-factor authentication** — a code from an authenticator app is required to sign in, so a stolen password alone can't get in. Single-use recovery codes cover a lost phone.
- **Signed-in devices** — every device with access to your account, with one-click sign-out per device and "sign out all other devices."
- **Security activity log** — every sign-in, failed attempt, password or two-factor change, share link, and export, with the device it came from. If something wasn't you, you'll see it.
- **New-device alerts** — an email the moment your account is accessed from a device it hasn't used before.
- **Download your data** — everything we hold about your business as one file, any time. No lock-in.
- **Delete your account** — permanent removal of every row, file, and search vector, confirmed with your password. Not a soft delete.

## Data isolation

Every query in the product is scoped to your business. Documents, extracted records, and the semantic search index are partitioned per business — the search index literally runs in a per-business namespace. The public demo runs on fictional seeded data and is **read-only, enforced server-side**.

## Access to shared materials

Nothing leaves your account without an explicit share link created by you. Links are:

- **Tiered** — a public teaser exposes no financials; confidential tiers require the viewer to identify themselves and verify their email before the server releases anything sensitive
- **Expirable** — confidential links default to a 90-day expiry
- **Cappable** — optional view limits, enforced server-side on the request that releases data
- **Revocable** — instantly, from your deal room
- **Logged** — viewer identity, sections read, and time spent, for your records

## Application security practices

- Passwords stored as salted PBKDF2 hashes; constant-time comparisons on all secret checks
- Every session individually revocable; all sessions revoked on password reset (a stolen session dies when you reset)
- Rate limiting on sign-in, sign-up, two-factor, password reset, and every public sharing endpoint
- Strict security headers (HSTS, CSP, frame-deny, content-type sniffing disabled)
- Server-side validation of every input; uploaded files are never executed or trusted
- Viewer and visitor IP addresses stored only as one-way hashes
- Continuous error monitoring, and a CI pipeline that blocks deployment on failing tests — including an end-to-end suite that exercises the live product on every release

## AI data handling

Documents are processed by AI models (Cloudflare Workers AI, Anthropic, Google, Mistral) solely to extract and draft **your** content, under agreements that do not permit training on your data. AI-extracted records the system isn't confident about are withheld and flagged for your review rather than silently accepted.

## People and process

Successio is a small company; production access is limited to the operator, protected by hardware-backed authentication with the infrastructure providers. Secrets are stored encrypted and rotated on exposure.

## Reporting a vulnerability

Found something? Tell us at [the contact page](/contact) — include steps to reproduce. We commit to acknowledging reports within 72 hours and to not pursuing good-faith researchers.

> note: We're candid about maturity: Successio does not yet hold a SOC 2 attestation. This page describes the real controls in place today, and we're happy to walk any partner's security team through them directly.
`;

export default function SecurityPage() {
  return <LegalPage eyebrow="Trust" title="Security at Successio" updated="September 10, 2026" body={BODY} />;
}
