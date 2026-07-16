/**
 * Help-center content. Every user-facing feature gets a detailed article:
 * what it does, how to use it step by step, and what to do when something
 * looks wrong. Written for the actual customer — a business owner, not a
 * software person. Keep claims accurate to real product behavior.
 */

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  /** One-sentence summary shown on cards and in search results. */
  summary: string;
  /** Markdown body — subset supported by src/lib/help/markdown.tsx. */
  body: string;
}

export const HELP_CATEGORIES = [
  "Getting started",
  "Documents & AI",
  "Your business record",
  "Deal room & sharing",
  "Account & security",
  "For associations",
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting started ─────────────────────────────────────────────────────────
  {
    slug: "getting-started",
    title: "Start here: your first 30 minutes",
    category: "Getting started",
    summary: "The five steps that take you from an empty account to a business record a buyer could actually read.",
    body: `
Successio turns the paperwork and know-how of your business into something a buyer, a lender, or your own crew can understand — so that when you're ready to hand it off, the handoff can actually happen. Here's the fastest path from a brand-new account to real progress.

## 1. Fill in your business details

Go to [Settings](/settings) and complete the basics: business name, location, year founded, employee count, and annual revenue. These take two minutes and they anchor everything else — the readiness score, the buyer profile, and the map your association sees all draw from them.

## 2. Upload your first documents

Go to [Upload](/upload) and drag in whatever you have — or on your phone, tap the upload zone and photograph paper straight from the filing cabinet. Good first documents:

- A customer list (spreadsheet, printout, even handwritten)
- Last year's P&L or tax return
- An equipment list or insurance schedule
- A few work orders or quotes

The AI reads each file, pulls out customers, equipment, people, and financials, and files everything in your [Document Vault](/vault). See [Uploading documents](/help/uploading-documents) for the details.

## 3. Check what the AI found

Open [Business Data](/data). Every customer, machine, person, and financial year the AI extracted lives here in plain tables. Fix anything it got wrong, and add what it missed — a machine only you know about, the customer relationship that lives in your head. See [Business Data](/help/business-data).

## 4. Record what's in your head

The most valuable part of your business never made it onto paper. Go to [Knowledge](/knowledge), hit the microphone, and answer one of the interview questions out loud — "How do you quote a job?" takes three minutes to answer and becomes a written procedure a new owner can follow. See [Capturing know-how by voice](/help/knowledge-capture).

## 5. Watch your Sale Readiness Score climb

Your [Dashboard](/dashboard) shows a 0–100 score that measures how ready your business is to change hands. Every document processed and every record added moves it. Once you cross **30**, you can generate your buyer-facing business profile in the [Deal Room](/profile). See [How the Sale Readiness Score works](/help/readiness-score).

> tip: You don't have to do this in one sitting. Ten minutes a week — a few documents, one voice recording — compounds fast. The dashboard always shows you the most valuable next thing to add.
`,
  },
  {
    slug: "readiness-score",
    title: "How the Sale Readiness Score works",
    category: "Getting started",
    summary: "What the 0–100 score measures, the six categories behind it, and how to raise it.",
    body: `
The Sale Readiness Score on your [Dashboard](/dashboard) is a 0–100 measure of one question: **if a serious buyer showed up tomorrow, how much of your business could they actually understand?** It's recalculated automatically every time a document finishes processing or you add a record by hand.

## The six categories

The score is a weighted blend of six areas, mirroring what buyers and lenders ask for first:

- **Financial records (25%)** — the biggest slice. One year of P&L data starts it; **three distinct years** earns full marks. The same year from two different documents counts once, not twice.
- **Customer documentation (20%)** — who you sell to. Having any customers recorded starts it; three or more, then five or more, fill it out.
- **Operations & know-how (20%)** — written procedures. One SOP starts it, three or more fill it. Voice recordings that become SOPs count.
- **Equipment & assets (15%)** — your equipment list. One item starts it; five or more fill it.
- **People (10%)** — key personnel with roles recorded.
- **Legal & compliance (10%)** — currently satisfied by having processed documentation on file; finer-grained checks (licenses, certifications) are coming.

## The checklist

Below the gauge, the dashboard shows a checklist grouped by these categories. Items check themselves off as your data grows — you never tick them manually. The "what to upload next" suggestions point at your emptiest categories, which is where the next document earns the most points.

## Why the score matters beyond the number

- The Deal Room requires a score of at least **30** before it will generate a buyer profile — below that there isn't enough substance to write one.
- If your business came in through a trade association, your association can see aggregate readiness across members — a rising score is how they know the program is working.

> tip: The fastest early points: upload three years of tax returns or P&Ls (25% of the whole score), then a customer list. Those two uploads alone can move you 30+ points.
`,
  },

  // ── Documents & AI ──────────────────────────────────────────────────────────
  {
    slug: "uploading-documents",
    title: "Uploading documents (and photographing paper)",
    category: "Documents & AI",
    summary: "Every way to get files in — drag and drop, phone camera, email, and cloud drives — and what happens after.",
    body: `
The [Upload](/upload) page accepts almost anything your business runs on: PDFs, spreadsheets (Excel and CSV, including QuickBooks exports), Word documents, photos, and even audio recordings. Files up to **200 MB** each.

## From a computer

Drag files onto the upload zone, or click it to browse. You can drop a whole batch at once — each file shows its own progress and processing status.

## From your phone (the filing cabinet workflow)

Open successio.pro on your phone, go to Upload, and tap the upload zone — your camera opens. Photograph documents page by page, straight from the cabinet. A few tricks for clean reads:

- Lay the page flat in good light; avoid shadows across the text
- Fill the frame with the page — closer is better than artsy
- One page per photo is fine; the AI stitches meaning across your whole vault anyway

## Other ways in

- **Email** — every business has a private ingest address; forward documents to it and they process automatically. See [Emailing documents](/help/email-documents).
- **Cloud drives** — import directly from Dropbox, Google Drive, OneDrive, or SharePoint. See [Cloud import](/help/cloud-import).

## What happens after you upload

Each file moves through a pipeline you can watch in the [Vault](/vault):

1. **Queued** — waiting its turn (usually seconds)
2. **OCR** — the text is being read (scanned paper takes the longest)
3. **Extracting** — the AI pulls out customers, equipment, people, financials, processes, and milestones
4. **Embedding** — the document is indexed for semantic search
5. **Complete** — done, and your readiness score has updated
6. **Needs review** — done, but the AI wasn't confident about some of what it found; it's asking for your eyes. See [the Vault article](/help/document-vault) for the review flow.

When a batch finishes, you get one summary email — not one per file.

## If a document fails

A red **failed** badge means processing hit a wall (corrupted file, unreadable scan). Hover the card and press **Retry**. If it fails twice, try re-photographing the page or re-exporting the file. A document stuck in a processing state for more than 15 minutes can also be retried.
`,
  },
  {
    slug: "email-documents",
    title: "Emailing documents to your vault",
    category: "Documents & AI",
    summary: "Your business has a private email address — anything sent to it lands in the vault and processes automatically.",
    body: `
Every business on Successio gets a **private ingest address**. Email a document to it — or have your bookkeeper, accountant, or office manager forward one — and it flows into your vault and through the same AI pipeline as an upload.

## Finding your address

Your address is shown in [Settings](/settings) under "Email documents in". It looks like:

\`docs+YOURCODE@successio.pro\`

The code in the middle is unique and unguessable — that's what keeps strangers from mailing files into your account. **Treat the address like a key**: share it with people you trust to add documents, and nobody else.

## How to use it

1. Forward any email with attachments to your ingest address — the attachments are what get processed (up to 10 per email, 25 MB each).
2. Works great for things that already arrive by email: bank statements, insurance renewals, supplier invoices, scanned pages from a copier that emails PDFs.
3. Each attachment shows up in the [Vault](/vault) within a minute or two and processes normally.

> note: The email body itself isn't ingested — only attachments. And the sender's address doesn't matter; the ingest address is the credential, so forwards from your accountant work without any setup.

## If something doesn't arrive

- Check the attachment count and size — more than 10 attachments or files over 25 MB are skipped.
- Confirm the address was copied exactly, including the code after the plus sign.
- Anything rejected simply bounces; nothing is silently discarded.
`,
  },
  {
    slug: "cloud-import",
    title: "Importing from Dropbox, Google Drive & OneDrive",
    category: "Documents & AI",
    summary: "Pull documents straight from your cloud storage without downloading and re-uploading.",
    body: `
If your records already live in a cloud drive, you can import them directly from the [Upload](/upload) page — no downloading to your computer first.

## Supported services

- **Dropbox**
- **Google Drive** (including Google Docs and Sheets, which convert to PDF/Excel automatically)
- **OneDrive and SharePoint**

## How it works

1. On the Upload page, choose the service's button under the upload zone.
2. The service's own file picker opens — you sign in **with the service directly**. Successio never sees your cloud password; the picker hands over access to only the specific files you choose.
3. Select up to 25 files (100 MB each) and confirm. They import server-side and enter the normal processing pipeline.

## Notes

- Google-native files (Docs, Sheets, Slides, Drawings) are exported to standard formats on the way in — a Google Sheet arrives as an Excel file, a Doc as a PDF.
- Imports show up in the [Vault](/vault) with the same statuses as regular uploads.
- Nothing stays connected afterward: each import is a one-time grant, not a standing link to your drive.
`,
  },
  {
    slug: "document-vault",
    title: "The Document Vault: search, review & retry",
    category: "Documents & AI",
    summary: "Where every document lives — with AI search, extraction details, review confirmation, thumbnails, and retry.",
    body: `
The [Vault](/vault) is the filing cabinet, rebuilt. Every document you've ever uploaded is here, with what the AI found in it.

## Finding things

- **Type 1–2 characters** to filter by filename.
- **Type 3 or more characters** and the search switches to **AI search** — it matches by meaning, not spelling. Searching "biggest customer contract" finds the right documents even if none of those words appear in a filename. Results are ranked by relevance.
- **Status chips** (All / Complete / Needs review / Extracting / Queued / Failed) filter server-side; large vaults load 50 documents at a time with a "Load more" button.

## Document cards

Each card shows the file's name, type, current status, and its OCR confidence (how cleanly the text was read). Photographed documents show a small image preview.

## The detail panel

Click any document to open the slide-over:

- **Metadata** — type, size, upload date, OCR confidence
- **Extracted entities** — everything the AI pulled out, grouped (customers, equipment, financials, people, processes, milestones), each group with a confidence badge
- **Raw OCR text** — the exact text the AI read, so you can verify the source
- **Download original file** — the untouched file you uploaded

## The review flow

When the AI isn't confident about part of a document (below 70% certainty), the document lands in **Needs review** instead of Complete, and low-confidence records are **held out of your business record** rather than quietly mixed in. In the detail panel you'll see an orange banner:

1. Look over the extracted entities — the flagged groups show what the AI was unsure about.
2. Fix anything wrong (or add what's missing) on the [Business Data](/data) page.
3. Press **"Looks right — mark reviewed"**. The document completes and the flags clear.

> tip: This is the single most important habit in the product: anything with a review flag was uncertain enough that we refused to put it in front of a buyer without you seeing it first.

## Retry

Failed documents show a **Retry** button right on the card. Documents stuck in a processing state for over 15 minutes can be retried the same way.
`,
  },
  {
    slug: "how-ai-reads",
    title: "How the AI reads your documents",
    category: "Documents & AI",
    summary: "What actually happens between upload and extracted data — OCR, extraction, confidence, and what the AI will never do.",
    body: `
A quick tour of the machinery, in plain terms — because you're trusting it with your business record and you deserve to know how it behaves.

## Step 1: Reading the text (OCR)

- **Digital files** (PDFs with real text, spreadsheets, Word docs) are read directly and near-perfectly.
- **Scanned paper and photos** go through document AI trained for exactly this — printed pages read at roughly 95% accuracy. Very poor scans fall back to a second reader, and if neither can make sense of a page, the document is flagged for review instead of guessing.
- **Voice recordings and audio files** are transcribed with speech recognition.

## Step 2: Understanding it (extraction)

The text goes to a language model with instructions tuned to your trade — a machine-shop work order is read differently from a trucking rate confirmation. It pulls out structured records: customers, equipment, financial years, people, procedures, and company milestones.

## Step 3: Confidence — the honesty mechanism

Every extracted record carries a confidence rating. Records **below 70% confidence never enter your business record automatically**. They're held in the document's detail panel, the document is flagged "Needs review", and you decide: fix the record on [Business Data](/data), or confirm the extraction was right. Nothing uncertain reaches a buyer without your sign-off.

## What the AI will never do

- It never invents numbers. If a P&L is unreadable, you get a review flag — not a made-up revenue figure.
- It never sends anything to a buyer. Sharing is always your explicit action in the [Deal Room](/profile).
- It never mixes businesses. Your documents, extractions, and search index are isolated to your account.

## When it gets something wrong

It will, sometimes — usually on rough handwriting or unusual layouts. That's what the review flow and the [Business Data](/data) page are for: every AI-extracted record can be corrected or deleted by hand, and your fix is what the profile and score use from then on.
`,
  },

  // ── Your business record ────────────────────────────────────────────────────
  {
    slug: "business-data",
    title: "Business Data: fixing and adding records by hand",
    category: "Your business record",
    summary: "The tables behind your business record — review AI extractions, correct them, and add what only you know.",
    body: `
[Business Data](/data) is the master record of your business — four plain tables the AI fills from your documents and you complete from your head. Everything here feeds the readiness score and the buyer profile.

## The four tabs

- **Customers** — name, share of revenue, contract status (active / month-to-month / expired), notes
- **Equipment** — name, make and model, year installed, condition, estimated value
- **People** — name, role, years with the company, and a **key person** flag for the people the business can't run without
- **Financials** — one row per year: revenue, gross profit, EBITDA, owner compensation

Each row shows whether it was **Extracted** from a document or entered **Manually**.

## Adding a record

Press **Add** on any tab, fill in the fields (only the name — and year, for financials — is required), and save. Your readiness score refreshes immediately, exactly as if a document had been processed.

## Fixing an AI mistake

Press the pencil on any row, correct it, save. Corrections stick — they're your record now.

## Why manual entry matters more than it sounds

Buyers consistently care most about things that were never written down anywhere:

- The customer who's been with you 20 years on a handshake
- The machine you bought used that's worth triple what the books say
- The foreman who can run the shop without you

Five minutes of typing here can be worth more to your profile than a folder of paperwork.

> tip: Revenue share on customers is entered as a percentage — if Acme is about a quarter of your business, enter 25. Buyers read customer concentration before almost anything else.
`,
  },
  {
    slug: "knowledge-capture",
    title: "Capturing know-how by voice",
    category: "Your business record",
    summary: "Talk for three minutes, get a written procedure — the interview questions, recording, and editing SOPs.",
    body: `
Thirty years of running a business puts an enormous amount of knowledge in one place: your head. The [Knowledge](/knowledge) page gets it out — by voice, because talking is faster and more honest than writing.

## The interview questions

The page shows questions tailored to your trade — a machine shop gets "How do you quote a job from scratch?", a trucking company gets "How do you find loads?". They're chosen because they're what a new owner would ask you on day one. Pick one, or ignore them and talk about whatever matters.

## Recording

1. Press the microphone button (your browser will ask permission the first time).
2. Talk like you're training a new hire — rambling is fine, the AI sorts it out.
3. Press stop. The recording is transcribed, and the AI drafts a **standard operating procedure**: a title, ordered steps, and notes.
4. Review the draft — edit the title or any step inline — then save it.

## Your SOP library

Saved procedures live below the recorder, searchable. Each card shows the steps in order, who owns the process, and when it was last touched. Edit any SOP inline anytime; procedures also flow into the Operations section of your buyer profile.

## What makes a good recording

- **One process per recording.** "How we handle a warranty claim" beats "everything about customer service."
- **Say the exceptions out loud.** "Normally X, but if the customer is Acme we always Y" — that's the tribal knowledge buyers pay for.
- **Name names.** Who does the step, who to call when it breaks.

> tip: Can't think where to start? Answer this one: "If you were gone for a month, what would go wrong first?" The answer is always the most valuable SOP in the building.
`,
  },
  {
    slug: "history-legacy",
    title: "The History timeline & Legacy Book",
    category: "Your business record",
    summary: "The story of the business, told properly — auto-built from your documents, editable by you.",
    body: `
Numbers alone don't sell a business people spent their lives building. Two features tell the story side:

## History timeline

The [History](/history) page assembles a year-by-year timeline of the business — founding, growth milestones, big equipment purchases, key hires — drawn automatically from your documents and augmented by hand. A revenue sparkline runs alongside it, built from your financial records (one point per year, duplicates reconciled automatically).

- **Add a milestone** with the add button: year, category, title, and a line or two of description.
- **Extracted milestones** (from documents) are marked as such; you can edit or remove any of them.

Buyers see a version of this timeline in the deal room — it's often the section that makes a business feel like more than a spreadsheet.

## Legacy Book

The [Legacy Book](/legacy) turns your record into a narrative document about the business — where it came from, how it runs, what it stands for — drafted by AI from everything you've built in Successio and editable by you. It's for the human audience: your family, your crew, the buyer who wants to understand what they're carrying forward.

> tip: The timeline is a great "ten minutes on a Sunday" feature. Three or four milestones — the year you bought the building, the year you landed the big account — give a buyer the shape of the business instantly.
`,
  },

  // ── Deal room & sharing ─────────────────────────────────────────────────────
  {
    slug: "deal-room",
    title: "Generating your business profile",
    category: "Deal room & sharing",
    summary: "How the buyer-facing profile is drafted, what's in it, how to regenerate it, and the PDF export.",
    body: `
The [Deal Room](/profile) is where your business record becomes a document a buyer can evaluate — a professional business profile (what brokers call a CIM), drafted by AI from your actual data.

## Before you can generate

Your readiness score must be at least **30**. Below that, there isn't enough substance for an honest profile — the dashboard's checklist shows exactly what to add.

## Generating

Press **Generate profile**. The AI drafts nine sections from your record:

- Executive Summary
- Business Overview
- The Opportunity
- Customer Overview
- Financial Highlights
- Operations
- Team & People
- Equipment & Assets
- Reason for Sale

Everything is drawn from your documents and Business Data — financials come from your recorded years (one figure per year, reconciled), customers from your customer table, operations from your SOPs. The AI writes the narrative; it doesn't invent the facts.

## Review it like a buyer will

Expand each section in the preview and read it. If a fact is wrong, fix the **source** — the record on [Business Data](/data) — then press **Regenerate profile**. The profile always reflects your current record, so keeping the record right keeps the profile right.

## PDF export

Press **PDF** to render the profile as a clean document, stored with your account and downloadable — for printing, emailing to your attorney, or handing across a table.

> note: Generating is not sharing. Nothing leaves your account until you create a share link — see [Share links](/help/share-links).
`,
  },
  {
    slug: "share-links",
    title: "Share links: tiers, expiry & view limits",
    category: "Deal room & sharing",
    summary: "The four access tiers, how the NDA gate works, setting expiry and view caps, and reading the access log.",
    body: `
Sharing is deliberate and layered: you choose exactly how much each person sees, every link can expire, and every view is logged.

## The four tiers

- **Teaser (public)** — business name, industry, general description, the opportunity. **No financials, no customer details.** Safe to post anywhere; anyone with the link can see it.
- **NDA-gated** — the full profile including financial highlights and customer overview. Viewers must enter their **name and email** and agree to confidentiality before anything confidential loads. The gate is enforced by the server, not just hidden on the page.
- **Lender Package** — for banks, SBA lenders, and CDFIs: the full profile plus a downloadable data bundle (financial years, customer list, equipment, procedures) in a structured format their analysts can work with.
- **Buyer Access** — everything in the NDA tier, plus the viewer can **request specific documents** from you. Nothing is auto-released; see [Buyer document requests](/help/buyer-requests).

## Creating a link

In the Deal Room's share section, pick a tier, then choose:

- **Expiry** — 7, 30, or 90 days, or never. Confidential tiers default to **90 days** so a forgotten link doesn't live forever.
- **View limit** — cap total views (10 / 25 / 100) or leave unlimited.

Press **Create link** — it's copied to your clipboard automatically. Each tier has one live link at a time; the link's expiry date and view count show right under it.

## Revoking

Press the trash icon next to any link. It stops working immediately — including for anyone who has it open in a tab.

## The access log

Every view is recorded: who (name and email, when the NDA gate was used), which tier, **which sections they actually read**, and how long they spent. A viewer who read Financial Highlights for six minutes is telling you something; so is one who bounced in thirty seconds.

> tip: Standard flow for a new buyer conversation: send the Teaser first. If they're real, they'll ask for more — then send an NDA-gated link with a 30-day expiry and a view limit. Escalate to Buyer Access only when they've earned it.
`,
  },
  {
    slug: "buyer-requests",
    title: "Buyer document requests",
    category: "Deal room & sharing",
    summary: "How serious buyers ask for specific documents, and how you approve or decline — nothing is ever auto-shared.",
    body: `
When a buyer is genuinely evaluating your business, they'll want specifics: tax returns, the lease, the contract with your biggest customer. **Buyer Access** links have a built-in channel for exactly this — with you in control of every response.

## What the buyer sees

At the bottom of a Buyer Access link, a "Need something specific?" form lets them describe what they want (with their name and email). Submitting it does **not** give them anything — it sends the request to you.

## What you see

- An **email** the moment a request arrives, quoting what was asked.
- A **Document requests** section in your [Deal Room](/profile) listing every request with who asked, when, and an open-request counter.

## Responding

For each request you choose:

- **Mark fulfilled** — after you've sent the material through whatever channel you prefer (email, your attorney, in person). Successio records the request as handled; it does not transmit the documents itself.
- **Decline** — for requests that are premature or out of bounds. The request is closed.

> note: This human-in-the-loop design is intentional. Requests for sensitive documents deserve a decision, not an automation — and the request log gives you a paper trail of what each buyer asked for and when.
`,
  },

  // ── Account & security ──────────────────────────────────────────────────────
  {
    slug: "account-security",
    title: "Your account, email verification & security",
    category: "Account & security",
    summary: "Signing in, verifying your email, resetting your password, and how your data is protected.",
    body: `
## Your account

You sign in with your email and password. Sessions last 30 days on a device; signing out ends the session immediately.

## Email verification

After signup we send a confirmation link. You can use the whole product before confirming, but verify when you can — [Settings](/settings) shows your status and a resend button. A verified address is what makes password recovery and share notifications reliable.

## Forgot your password?

Use "Forgot password" on the sign-in page. The reset link arrives by email and works once. **Resetting your password also signs out every other device** — so if you ever suspect someone else had access, a reset locks them out everywhere.

## How your data is protected

- **Isolation** — your documents, extracted records, and search index are scoped to your business. No other account can query them.
- **Sharing is opt-in, always** — nothing is visible outside your account until you create a share link, and every link is tiered, expirable, revocable, and logged. See [Share links](/help/share-links).
- **Transport & storage** — everything moves over HTTPS and lives in Cloudflare's infrastructure (database and file storage).
- **The demo can't touch your data** — the public demo runs on fictional seeded businesses and is read-only, enforced server-side.

## Your team

You can have advisors or family members with their own logins under your business. Everyone sees the same business record; the access log and share controls remain yours.

## Deleting your data

Contact us via [the contact page](/contact) and we'll remove your account, documents, and extracted records. (In-app self-service deletion is coming.)
`,
  },
  {
    slug: "settings",
    title: "Settings: business details & integrations",
    category: "Account & security",
    summary: "Business details that anchor your profile, your private email-ingest address, and account status.",
    body: `
[Settings](/settings) is short but load-bearing:

## Business details

Name, location, year founded, employee count, annual revenue, and a free-text description. These anchor the readiness score, appear on your buyer profile, and place your pin on your association's map (only your city-level location is used — never a street address).

> tip: The description field is worth two thoughtful sentences: it seeds the tone of your generated profile's Business Overview.

## Email documents in

Your private ingest address (\`docs+…@successio.pro\`) with a copy button. Anything emailed to it lands in your vault. Full details in [Emailing documents](/help/email-documents).

## Account

Your email address and verification status, with a resend button if you haven't confirmed yet.
`,
  },

  // ── For associations ────────────────────────────────────────────────────────
  {
    slug: "for-associations",
    title: "For associations: the partner portal",
    category: "For associations",
    summary: "How trade associations run succession-readiness programs for their members — roster, metrics, and invites.",
    body: `
Trade associations use Successio to run succession-readiness programs for their members — because the wave of owner retirements hits their industries first, and they're who owners already trust.

## The admin portal

Association administrators get a dedicated portal at [/admin](/admin) with:

- **Overview** — member count, pending invites, average readiness score across members, score lift since joining, and recent activity
- **Member roster** — every member business with its vertical, location, latest readiness score, and document count
- **Readiness report** — the score distribution across your membership, members at risk (low or no score), and a breakdown by trade

Administrators see member-level readiness — never member documents or financials. Each business's data stays its own.

## Inviting members

From the portal, import your member roster (business name, contact email, trade) and send invites in bulk. Each member gets a personalized signup link that connects their new account to your association automatically.

## Becoming a partner

If you run an association and want a program for your members — including white-labeling — start at [the partners page](/partners) or [contact us](/contact).
`,
  },
];

/** Article lookup by slug. */
export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

/** Articles grouped by category, in category display order. */
export function articlesByCategory(): { category: string; articles: HelpArticle[] }[] {
  return HELP_CATEGORIES.map((category) => ({
    category,
    articles: HELP_ARTICLES.filter((a) => a.category === category),
  })).filter((g) => g.articles.length > 0);
}
