import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Privacy Policy — Successio" };

const BODY = `
This policy describes what Successio collects, why, and what happens to it. The short version: your business documents are yours, we process them only to run the product for you, we don't sell data, and you can have everything deleted.

## What we collect

- **Account data** — your name, email address, and password (stored only as a salted cryptographic hash).
- **Business content** — the documents you upload or email in, records you enter (customers, equipment, financials, people, procedures), voice recordings you make, and the profiles the Service generates from them. This can include sensitive financial information and personal information about your employees and customers.
- **Share-visitor data** — when someone opens a share link: the name and email they enter at the NDA gate, a one-way hash of their IP address (never the raw address), which sections they viewed, and for how long. This exists so you have an access log.
- **Operational data** — logs and error reports needed to keep the Service running.

## How we use it

- To operate the product: reading your documents with AI, building your business record, computing your readiness score, generating profiles, and powering the sharing features you invoke.
- To communicate with you: account emails (verification, password reset), processing notifications, and occasional re-engagement reminders — **every non-essential email includes an unsubscribe link, honored immediately**.
- We do **not** sell personal data, and we do not use your business documents to train AI models.

## Who processes it (subprocessors)

- **Cloudflare** — hosting, database, file storage, email delivery, and AI inference infrastructure. Data is encrypted in transit and at rest.
- **Anthropic, Google, and Mistral** — AI providers used to read documents and draft text, receiving document content only to process your requests.
- **OpenStreetMap / Nominatim** — receives business city/state location strings (never documents or financials) to place businesses on internal maps.
- **Sentry** — error monitoring; reports are scrubbed of personal data where feasible.
- **GitHub** — source code and deployment automation; it does not receive customer data.

## Sharing you control

Nothing about your business is visible outside your account unless you create a share link. Each link's tier controls exactly what a viewer sees, links can expire or be revoked, and every view is logged for you. If your account came through a trade association program, the association sees your readiness score and basic business facts — never your documents or financials.

## Retention and deletion

Your content is retained while your account is active. Request deletion via [the contact page](/contact) and your account, documents, extracted records, files, and search index entries are removed within 30 days (short-lived backups age out on their own schedule; legal retention obligations are honored where they apply).

## Security

Encryption in transit (HTTPS everywhere) and at rest; per-business data isolation; tiered, revocable, logged sharing; hashed passwords; and session revocation on password reset. Details on [the security page](/security).

## Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal data. Exercise any of them via [the contact page](/contact) — we honor these requests for everyone, regardless of jurisdiction.

## Children

The Service is for business use by adults and is not directed at children under 16.

## Changes

Material changes to this policy will be announced in the Service or by email before they take effect.
`;

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" updated="July 16, 2026" body={BODY} />;
}
