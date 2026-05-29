# Successio — Claude-in-Chrome Click Test

A full manual QA pass, written to be executed by **Claude for Chrome** (or any
browser agent) against the **live** site. Paste the "Agent instructions" block
into Claude for Chrome and let it drive.

---

## Agent instructions (paste this into Claude for Chrome)

> You are QA-testing the live web app at **https://successio.pro**. Work through
> every test below **in order**. For each test: perform the steps, compare what
> you see to "Expected", and record **PASS** or **FAIL** with a one-line note
> (and a screenshot on FAIL). Do **not** stop on the first failure — complete all
> tests, then give me a summary table at the end (test #, name, PASS/FAIL, note).
> This is a shared demo with sample data; the demo sign-in needs no password.
> When a provider sign-in (Google/Microsoft/Dropbox) is required, use the
> accounts I've given you; if you can't sign in, mark that sub-step SKIPPED and
> continue.

**Base URL:** `https://successio.pro`
**Demo personas (no password — one click):** "Explore as a business owner"
(Carl Brenner / Brenner Precision Machining) and "Explore as an association"
(Heartland Tooling Alliance).

---

## A. Domain & marketing

**1. Apex loads**
- Go to `https://successio.pro`.
- **Expected:** marketing home renders (hero, nav). No cert warning.

**2. www → apex redirect**
- Go to `https://www.successio.pro/pricing`.
- **Expected:** redirects (301) to `https://successio.pro/pricing`; the page loads.

---

## B. Demo sign-in & session

**3. Demo chooser**
- Go to `https://successio.pro/demo`.
- **Expected:** two cards — "Explore as a business owner" and "Explore as an
  association" — not the old single-business timeline.

**4. Enter as business owner**
- On `/demo`, click **Explore as a business owner** → **Enter the demo**.
- **Expected:** lands inside the app at `/dashboard`, signed in (no bounce to
  `/login`). A readiness score/gauge is visible.

---

## C. Owner app (continue from test 4)

**5. Dashboard data**
- View `/dashboard`.
- **Expected:** a numeric Sale Readiness score (not "—"), a checklist grouped by
  category, and "what to upload next" suggestions.

**6. Document Vault is populated**
- Sidebar → **Document Vault** (`/vault`).
- **Expected:** at least 3 documents (e.g. customer-list, P&L, equipment-ledger),
  each with a status badge. **Not** "No documents yet".

**7. Vault detail slide-over**
- Click a document card.
- **Expected:** a slide-over shows extracted entities / details for that doc.

**8. Manual upload**
- Sidebar → **Upload** (`/upload`). Drag or browse a small PDF/image.
- **Expected:** the file shows progress → "queued"; no error. It later appears in
  the Vault.

**9. Cloud connectors present**
- On `/upload`, find the **"Import from cloud storage"** row.
- **Expected:** four buttons — **Dropbox, Google Drive, OneDrive, SharePoint** —
  all **active** (not greyed "Setup pending").

**10. Import from Google Drive** *(repeat for Dropbox / OneDrive / SharePoint)*
- Click **Google Drive**. Authorize (test user), pick a file in the Google Picker.
- **Expected:** picker opens; after selecting, a status like "Importing… /
  Imported 1 — processing now. Check your Vault." The file appears in the Vault.

**11. Knowledge — voice → SOP**
- Sidebar → **Knowledge** (`/knowledge`). Click the mic, record a few seconds of
  speech, stop, then **Transcribe & generate SOP**.
- **Expected:** "Transcribing & drafting…" then a drafted SOP (title + steps) you
  can edit. On any failure it shows a readable red error (never silent).

**12. Knowledge — save SOP**
- Edit the drafted SOP, click **Save** (or equivalent).
- **Expected:** it appears under **"Your SOPs"**.

**13. History timeline**
- Sidebar → **History** (`/history`).
- **Expected:** a milestone timeline (founding → growth → today) with category
  filters that work.

**14. Legacy Book — compose**
- Sidebar → **Legacy Book** (`/legacy`). Click **Compose the book**.
- **Expected:** "Composing the story…" then a rendered keepsake book — title
  page, chapters, "by the numbers", closing — styled like paper pages. A
  disabled "Order hardcover — coming soon" CTA.

**15. Deal Room — generate profile**
- Sidebar → **Deal Room** (`/profile`). Generate/refresh the profile.
- **Expected:** structured CIM sections render (no raw JSON, no parse error).

**16. Deal Room — export PDF**
- Click **Export PDF** (or "Download PDF").
- **Expected:** a new tab opens showing the generated business-profile PDF.

**17. Deal Room — share link**
- Open the Share modal; create a **Teaser (public)** link; open it in a new
  incognito tab.
- **Expected:** `/share/<token>` renders a tier-appropriate public view **without
  login**.

**18. Mobile nav drawer** *(set the browser to a narrow/mobile viewport)*
- On any app page, confirm the sidebar is hidden and a **☰** button shows in the
  top bar. Tap it.
- **Expected:** nav slides in over a dimmed backdrop. It closes via the **✕**,
  tapping the backdrop, **and** tapping any nav link.

**19. Sign out**
- Top bar → the sign-out (logout) icon.
- **Expected:** returns to `/login`; visiting `/dashboard` now redirects to
  `/login`.

---

## D. Association app

**20. Enter as association**
- Go to `/demo` → **Explore as an association** → **Enter the demo**.
- **Expected:** lands in the admin portal at `/admin`.

**21. Association overview**
- View `/admin`.
- **Expected:** member count (6), average readiness, a "lift" figure, a readiness
  distribution, and at-risk flags.

**22. Member roster & drill-in**
- Open the members list → click **Brenner Precision Machining**.
- **Expected:** a member detail page (`/admin/members/...`) with a story timeline,
  score history, checklist gaps, and documents.

**23. Gift the Legacy Book**
- On the member drill-in, click **Preview Legacy Book**.
- **Expected:** the member's keepsake book composes and renders (as in test 14).

---

## E. Negative / resilience

**24. Auth gate**
- While signed out, go directly to `https://successio.pro/vault`.
- **Expected:** redirected to `/login` (not an error page, not the vault).

**25. Errors are visible**
- (If any AI/import step fails during the run) confirm the failure shows a
  readable on-screen message rather than a silent no-op.

---

### Summary table (agent fills this in)

| # | Test | Result | Note |
|---|------|--------|------|
| 1 | Apex loads | | |
| … | … | | |
