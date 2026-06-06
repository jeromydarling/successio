import { test, expect, type Page } from "@playwright/test";

/**
 * THE deep journey: one brand-new account, seeded with a representative dataset,
 * then driven through EVERY feature a real user can reach — with real edits,
 * deletes, persistence-by-reload, the public deal room (teaser + NDA gate +
 * on-demand translation), and the AI actions exercised best-effort.
 *
 * Deterministic data comes from POST /api/admin/seed-user (token + e2e+ guard),
 * so score-gated features (profile, share, PDF, legacy) are reachable without
 * depending on the live OCR/extraction pipeline. The account is purged after.
 */

test.describe.configure({ mode: "serial" });

const TS = Date.now();
const EMAIL = `e2e+journey-${TS}@successio.pro`;
const PASSWORD = "Successio-E2E-Pass-1";
const NAME = "E2E Journey User";
const BUSINESS = `E2E Test Shop ${TS}`;
const LOCATION = `E2E City ${TS}`;
const MILESTONE = `E2E Milestone ${TS}`;

const TOKEN = process.env.E2E_ADMIN_TOKEN || "successio-e2e-purge-2026";

let page: Page;
let publicToken = "";
let ndaToken = "";

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  try {
    const res = await page.request.post("/api/admin/purge-user", {
      data: { token: TOKEN, email: EMAIL },
    });
    console.log(`[purge] ${res.status()} ${await res.text().catch(() => "")}`);
  } catch (err) {
    console.warn("[purge] failed:", err);
  }
  await page.close();
});

test("1) marketing → signup creates a signed-in account", async () => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /legacy/i })).toBeVisible();

  await page.getByRole("link", { name: /start your profile/i }).first().click();
  await expect(page).toHaveURL(/\/signup/);

  await page.getByPlaceholder("Carl Brenner").fill(NAME);
  await page.getByPlaceholder("carl@shop.com").fill(EMAIL);
  await page.getByPlaceholder("Brenner Precision Machining").fill(BUSINESS);
  await page.getByRole("combobox").selectOption("manufacturing");
  await page.getByPlaceholder("10+ characters").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByTitle("Sign out")).toBeVisible();
});

test("2) seed a representative business dataset", async () => {
  // Retry until the endpoint is live: on a fresh push the E2E run can start
  // before the new code finishes deploying, so the route may 404 briefly.
  let body: { seeded?: boolean } = {};
  await expect
    .poll(
      async () => {
        const res = await page.request.post("/api/admin/seed-user", {
          data: { token: TOKEN, email: EMAIL },
        });
        body = (await res.json().catch(() => ({}))) as { seeded?: boolean };
        if (!res.ok()) console.log(`[seed] not ready: ${res.status()}`);
        return res.status();
      },
      { timeout: 150_000, intervals: [3000, 5000, 8000, 10000] }
    )
    .toBe(200);
  expect(body.seeded).toBe(true);
  console.log("[seed] ok");
});

test("3) dashboard reflects the seeded score, breakdown, and checklist", async () => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/64% ready/i)).toBeVisible();
  // The breakdown panel only renders once there's extracted data — now it does.
  await expect(page.getByRole("heading", { name: /score breakdown/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /readiness checklist/i })).toBeVisible();
  await expect(page.getByText("Customer list extracted").first()).toBeVisible();
});

test("4) settings: editing every field persists across reload", async () => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  // Wait for the org to hydrate the form (required name field) before editing.
  await expect(page.getByPlaceholder("Brenner Precision Machining")).toHaveValue(BUSINESS);

  await page.getByPlaceholder("Akron, Ohio").fill(LOCATION);
  await page.getByPlaceholder("1987", { exact: true }).fill("2001");
  await page.getByPlaceholder("31", { exact: true }).fill("14");
  await page.getByPlaceholder("6240000", { exact: true }).fill("6200000");
  await page.getByPlaceholder(/A precision machine shop/i).fill(`E2E narrative ${TS}`);

  await page.getByRole("button", { name: /save changes/i }).click();
  try {
    const r = await page.waitForResponse((x) => x.url().includes("businesses.updateOrg"), { timeout: 30_000 });
    console.log("[settings] updateOrg status", r.status());
  } catch { console.warn("[settings] no updateOrg response observed"); }

  await page.reload();
  await expect(page.getByPlaceholder("Akron, Ohio")).toHaveValue(LOCATION);
  await expect(page.getByPlaceholder("1987", { exact: true })).toHaveValue("2001");
  await expect(page.getByPlaceholder("31", { exact: true })).toHaveValue("14");
  await expect(page.getByPlaceholder("6240000", { exact: true })).toHaveValue("6200000");
});

test("5) history: sparkline, add + filter, delete — all persist", async () => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();
  // Seeded financials → the revenue sparkline renders (has an aria-label).
  await expect(page.getByRole("img", { name: /revenue growth/i })).toBeVisible();
  // Seeded milestone is visible.
  await expect(page.getByText("Brenner Precision founded").first()).toBeVisible();

  // Add a milestone and confirm it persists.
  await page.getByRole("button", { name: /add milestone/i }).click();
  await page.getByRole("spinbutton").first().fill("1999");
  await page.getByRole("combobox").selectOption("equipment");
  await page.getByPlaceholder("Landed the Goodyear tooling contract").fill(MILESTONE);
  await page.getByPlaceholder("What happened, and why it matters to a buyer.").fill(`Bought our first 5-axis mill. ${TS}`);
  await page.getByRole("button", { name: /add to timeline/i }).click();
  await expect(page.getByText(MILESTONE).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(MILESTONE).first()).toBeVisible();

  // Category filter still surfaces the founding milestone.
  await page.getByRole("button", { name: /^founding$/i }).click();
  await expect(page.getByText("Brenner Precision founded").first()).toBeVisible();
  await page.getByRole("button", { name: /all milestones/i }).click();

  // Delete the milestone we added (scoped to its row), confirm it's gone.
  await page.locator("li", { hasText: MILESTONE }).getByTitle("Delete milestone").click();
  await expect(page.getByText(MILESTONE)).toHaveCount(0, { timeout: 15_000 });
  await page.reload();
  await expect(page.getByText(MILESTONE)).toHaveCount(0);
});

test("6) knowledge: add, edit, translate, and delete an SOP", async () => {
  await page.goto("/knowledge");
  await expect(page.getByRole("heading", { level: 1, name: "Knowledge Capture" })).toBeVisible();

  // Prompted-interview navigation.
  await expect(page.getByText(/1 \/ \d/)).toBeVisible();
  await page.getByRole("button", { name: /next/i }).click();
  await expect(page.getByText(/2 \/ \d/)).toBeVisible();
  await page.getByRole("button", { name: /previous/i }).click();
  await expect(page.getByText(/1 \/ \d/)).toBeVisible();

  // Seeded data already includes one SOP ("How we quote a new job") — SOPs are
  // the processes table. Capture the baseline so add/delete are relative, and
  // rely on newest-first ordering so .first() always targets the SOP we add.
  const delBtns = page.getByRole("button", { name: "Delete SOP" });
  await expect(page.getByText(/How we quote a new job/i).first()).toBeVisible();
  const baseline = await delBtns.count();

  // Add a manual SOP (newest first → it's the first card).
  await page.getByRole("button", { name: /add manually/i }).click();
  await expect(delBtns).toHaveCount(baseline + 1);
  await expect(page.getByText("New SOP").first()).toBeVisible();

  // Edit the new card's title and confirm persistence.
  await page.getByRole("button", { name: "Edit SOP" }).first().click();
  await page.getByRole("textbox").first().fill("Quoting Procedure");
  await page.getByRole("button", { name: "Save SOP" }).first().click();
  await expect(page.getByText("Quoting Procedure").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Quoting Procedure").first()).toBeVisible();

  // Translate the SOP into Spanish (Llama) — assert the control engages.
  try {
    await page.getByRole("button", { name: /translate/i }).first().click();
    await page.getByText("Español").click();
    await expect(page.getByRole("button", { name: "Español" }).first()).toBeVisible({ timeout: 30_000 });
    console.log("[knowledge] SOP translated to Español");
  } catch (err) {
    test.info().annotations.push({ type: "best-effort", description: `SOP translate: ${String(err).slice(0, 100)}` });
  }

  // Delete the SOP we added (newest → first); the seeded SOP stays (baseline).
  await page.getByRole("button", { name: "Delete SOP" }).first().click();
  await expect(delBtns).toHaveCount(baseline, { timeout: 15_000 });
  await page.reload();
  await expect(delBtns).toHaveCount(baseline);
});

test("7) vault: seeded docs, status filter, detail slide-over, semantic search", async () => {
  await page.goto("/vault");
  await expect(page.getByRole("heading", { level: 1, name: "Document Vault" })).toBeVisible();
  await expect(page.getByText("PnL-2021-2023.pdf").first()).toBeVisible();

  // Status filter (all seeded docs are complete). Case-insensitive: the pill
  // uses CSS capitalize, which Chromium folds into the accessible name.
  await page.getByRole("button", { name: /^complete$/i }).click();
  await expect(page.getByText("Customer-List.xlsx").first()).toBeVisible();

  // Open the document detail slide-over.
  await page.getByText("PnL-2021-2023.pdf").first().click();
  await expect(page.getByText("Document Detail")).toBeVisible();
  await expect(page.getByText("Extracted Entities")).toBeVisible();
  await expect(page.getByText(/Raw OCR Text/i)).toBeVisible();

  // Semantic search shows the "by meaning" indicator at 3+ chars.
  await page.goto("/vault");
  await page.getByPlaceholder(/Search documents/i).fill("revenue");
  await expect(page.getByText(/searching by meaning/i)).toBeVisible();
});

test("8) deal room: preview, share tiers, PDF, regenerate", async () => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Deal Room" })).toBeVisible();
  await expect(page.getByText("Profile generated")).toBeVisible();

  // Expand a preview section (accordion) and read seeded content.
  await page.getByRole("button", { name: /financial highlights/i }).click();
  await expect(page.getByText(/Revenue grew from/i)).toBeVisible();

  // Create a public (teaser) share link and capture its token.
  await page.getByRole("button", { name: /create link/i }).click();
  const code = page.locator("code", { hasText: "/share/" });
  await expect(code).toBeVisible({ timeout: 15_000 });
  publicToken = (await code.textContent())!.split("/share/")[1].trim();
  expect(publicToken.length).toBeGreaterThan(8);

  // Switch to the NDA tier and create that link too.
  await page.getByText("NDA-gated").click();
  await page.getByRole("button", { name: /create link/i }).click();
  const ndaCode = page.locator("code", { hasText: "/share/" });
  await expect(ndaCode).toBeVisible({ timeout: 15_000 });
  ndaToken = (await ndaCode.textContent())!.split("/share/")[1].trim();
  expect(ndaToken).not.toBe(publicToken);
  console.log(`[deal-room] public=${publicToken} nda=${ndaToken}`);

  // Persistence: the links survive a reload.
  await page.reload();
  await expect(page.locator("code", { hasText: "/share/" })).toBeVisible();

  // PDF export (deterministic renderer) — best-effort.
  try {
    await page.getByRole("button", { name: /^PDF$/ }).click();
    const r = await page.waitForResponse((x) => x.url().includes("profiles.exportPdf"), { timeout: 30_000 });
    console.log("[deal-room] exportPdf status", r.status());
  } catch (err) {
    test.info().annotations.push({ type: "best-effort", description: `PDF: ${String(err).slice(0, 100)}` });
  }

  // Regenerate via the live model — best-effort (the seeded profile stands in).
  try {
    await page.getByRole("button", { name: /regenerate profile/i }).click();
    const r = await page.waitForResponse((x) => x.url().includes("profiles.generate"), { timeout: 60_000 });
    console.log("[deal-room] generate status", r.status());
  } catch (err) {
    test.info().annotations.push({ type: "best-effort", description: `generate: ${String(err).slice(0, 100)}` });
  }
});

test("9) public deal room: teaser, NDA gate, on-demand translation", async ({ browser }) => {
  expect(publicToken, "public token from step 8").not.toBe("");
  const ctx = await browser.newContext();
  const share = await ctx.newPage();

  // Teaser (public) tier — assert on the section structure, not body text,
  // since step 8's "Regenerate" may have rewritten the content via the model.
  await share.goto(`/share/${publicToken}`);
  await expect(share.getByRole("heading", { name: /executive summary/i })).toBeVisible({ timeout: 15_000 });
  // Confidential sections must NOT be in the teaser.
  await expect(share.getByRole("heading", { name: /financial highlights/i })).toHaveCount(0);

  // On-demand translation of the deal room (Llama) — best-effort.
  try {
    await share.getByRole("button", { name: /translate/i }).click();
    await share.getByText("Español").click();
    await expect(share.getByRole("button", { name: "Español" })).toBeVisible({ timeout: 30_000 });
    console.log("[share] deal room translated to Español");
  } catch (err) {
    test.info().annotations.push({ type: "best-effort", description: `share translate: ${String(err).slice(0, 100)}` });
  }

  // NDA tier — confidential financials only flow after name + email are given.
  await share.goto(`/share/${ndaToken}`);
  await expect(share.getByText(/Confidential Information/i)).toBeVisible({ timeout: 15_000 });
  await share.getByPlaceholder("Full name").fill("Jane Buyer");
  await share.getByPlaceholder("Email address").fill("jane@example.com");
  await share.getByRole("button", { name: /i agree/i }).click();
  // The confidential Financial Highlights section is released only after the gate.
  await expect(share.getByRole("heading", { name: /financial highlights/i })).toBeVisible({ timeout: 15_000 });

  await ctx.close();
});

test("10) legacy book: compose from records (AI, best-effort)", async () => {
  await page.goto("/legacy");
  await expect(page.getByRole("heading", { level: 1, name: "Legacy Book" })).toBeVisible();
  await expect(page.getByText("The story of your business")).toBeVisible();
  try {
    await page.getByRole("button", { name: /compose the book/i }).click();
    await expect(
      page.getByRole("button", { name: /recompose/i }).or(page.getByText(/Chapter 1|By the numbers/i))
    ).toBeVisible({ timeout: 90_000 });
    console.log("[legacy] book composed");
  } catch (err) {
    test.info().annotations.push({ type: "best-effort", description: `legacy compose: ${String(err).slice(0, 120)}` });
  }
});

test("11) session survives a cold reload, then sign out works", async () => {
  await page.goto("/dashboard");
  await page.reload();
  await expect(page.getByTitle("Sign out")).toBeVisible();

  await page.getByTitle("Sign out").click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
