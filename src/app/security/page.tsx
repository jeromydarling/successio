import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Security — Successio" };

const BODY = `
You're trusting Successio with the financial record of a life's work. Here is plainly what protects it — written for owners, and detailed enough for a lender's vendor review.

## Infrastructure

The Service runs entirely on **Cloudflare's global platform** — application code on Cloudflare Workers, the database on Cloudflare D1, and files on Cloudflare R2. All customer data is **encrypted in transit (TLS everywhere)** and **encrypted at rest** by the platform. There are no self-managed servers to patch and no third-party data centers in the path.

## Data isolation

Every query in the product is scoped to your business. Documents, extracted records, and the semantic search index are partitioned per business — the search index literally runs in a per-business namespace. The public demo runs on fictional seeded data and is **read-only, enforced server-side**.

## Access to shared materials

Nothing leaves your account without an explicit share link created by you. Links are:

- **Tiered** — a public teaser exposes no financials; confidential tiers require the viewer to identify themselves before the server releases anything sensitive
- **Expirable** — confidential links default to a 90-day expiry
- **Cappable** — optional view limits, enforced server-side on the request that releases data
- **Revocable** — instantly, from your deal room
- **Logged** — viewer identity, sections read, and time spent, for your records

## Application security practices

- Passwords stored as salted PBKDF2 hashes; constant-time comparisons on all secret checks
- Session revocation on password reset (a stolen session dies when you reset)
- Rate limiting on sign-in, sign-up, password reset, and every public sharing endpoint
- Strict security headers (HSTS, CSP, frame-deny, content-type sniffing disabled)
- Server-side validation of every input; uploaded files are never executed or trusted
- Viewer IP addresses stored only as one-way hashes
- Continuous error monitoring, and a CI pipeline that blocks deployment on failing tests

## AI data handling

Documents are processed by AI models (Cloudflare Workers AI, Anthropic, Google, Mistral) solely to extract and draft **your** content, under agreements that do not permit training on your data. AI-extracted records the system isn't confident about are withheld and flagged for your review rather than silently accepted.

## People and process

Successio is a small company; production access is limited to the operator, protected by hardware-backed authentication with the infrastructure providers. Secrets are stored encrypted and rotated on exposure.

## Reporting a vulnerability

Found something? Tell us at [the contact page](/contact) — include steps to reproduce. We commit to acknowledging reports within 72 hours and to not pursuing good-faith researchers.

> note: We're candid about maturity: Successio does not yet hold a SOC 2 attestation. This page describes the real controls in place today, and we're happy to walk any partner's security team through them directly.
`;

export default function SecurityPage() {
  return <LegalPage eyebrow="Trust" title="Security at Successio" updated="July 16, 2026" body={BODY} />;
}
