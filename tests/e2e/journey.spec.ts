import { test, expect, type Page } from "@playwright/test";

/**
 * THE journey: one brand-new account clicks through every screen a real user
 * can reach and performs every interaction that writes to the database. For
 * each create action we reload the page and re-assert, proving the data hit D1
 * (not just React state). Runs serially on a single shared page; the account is
 * purged in afterAll so CI runs never accumulate junk.
 *
 * AI/long actions (profile generation, legacy book, the document pipeline) are
 * exercised best-effort — a fresh account has a readiness score of 0, so the
 * score-gated generators are intentionally not reachable. The hard persistence
 * proofs are the pure-D1 writes: settings, a milestone, and a manual SOP.
 */

test.describe.configure({ mode: "serial" });

const TS = Date.now();
const EMAIL = `e2e+journey-${TS}@successio.pro`;
const PASSWORD = "Successio-E2E-Pass-1";
const NAME = "E2E Journey User";
const BUSINESS = `E2E Test Shop ${TS}`;
const LOCATION = `E2E City ${TS}`;
const MILESTONE = `E2E Milestone ${TS}`;

const PURGE_TOKEN = process.env.E2E_ADMIN_TOKEN || "successio-e2e-purge-2026";

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  // Best-effort cleanup — never fail the suite on cleanup. (Until the new
  // server code is deployed the endpoint may 404; a later run will purge.)
  try {
    // Send via JSON body, not query — a "+" in the email would otherwise be
    // decoded to a space by query parsing and miss the e2e+ allowlist.
    const res = await page.request.post("/api/admin/purge-user", {
      data: { token: PURGE_TOKEN, email: EMAIL },
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

  // Signed in: redirected to the dashboard and the sign-out control is present.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByTitle("Sign out")).toBeVisible();
});

test("2) dashboard renders the readiness score + checklist", async () => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  // Always present for any account. (The "Score breakdown" panel only renders
  // once there's extracted data, so it's absent for a fresh account.)
  await expect(page.getByText(/Sale Readiness Score/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /readiness checklist/i })).toBeVisible();
});

test("3) settings: editing business details persists across reload", async () => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  const location = page.getByPlaceholder("Akron, Ohio");
  await expect(location).toBeVisible();
  await location.fill(LOCATION);
  await page.getByPlaceholder(/A precision machine shop/i).fill(`E2E narrative ${TS}`);

  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText("Saved!")).toBeVisible();

  // Reload → value came back from D1, not local form state.
  await page.reload();
  await expect(page.getByPlaceholder("Akron, Ohio")).toHaveValue(LOCATION);
});

test("4) history: adding a milestone persists across reload", async () => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();

  await page.getByRole("button", { name: /add milestone/i }).click();
  await page.getByRole("spinbutton").first().fill("1999");
  await page.getByRole("combobox").selectOption("equipment");
  await page.getByPlaceholder("Landed the Goodyear tooling contract").fill(MILESTONE);
  await page
    .getByPlaceholder("What happened, and why it matters to a buyer.")
    .fill(`Bought our first 5-axis mill in 1999. ${TS}`);

  await page.getByRole("button", { name: /add to timeline/i }).click();
  await expect(page.getByText(MILESTONE).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(MILESTONE).first()).toBeVisible();
});

test("5) knowledge: adding a manual SOP persists across reload", async () => {
  await page.goto("/knowledge");
  await expect(page.getByRole("heading", { level: 1, name: "Knowledge Capture" })).toBeVisible();

  // "Add manually" creates a server-side SOP titled "New SOP".
  await page.getByRole("button", { name: /add manually/i }).click();
  await expect(page.getByText("New SOP").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("New SOP").first()).toBeVisible();
});

test("6) vault renders search + status filters", async () => {
  await page.goto("/vault");
  await expect(page.getByRole("heading", { level: 1, name: "Document Vault" })).toBeVisible();
  await expect(page.getByPlaceholder(/Search documents/i)).toBeVisible();
  // "All" must be exact so it doesn't match other status pills.
  await page.getByRole("button", { name: "All", exact: true }).click();
});

test("7) upload page renders; file upload is best-effort", async () => {
  await page.goto("/upload");
  await expect(page.getByRole("heading", { level: 1, name: "Upload Documents" })).toBeVisible();
  await expect(page.getByText(/Drag files here/i)).toBeVisible();

  // Best-effort real upload: the document row + R2 write should persist even if
  // the async OCR/extract pipeline doesn't finish during the test. Never fail
  // the journey if the storage stack isn't reachable from CI.
  const fileName = `e2e-upload-${TS}.txt`;
  try {
    const input = page.locator('input[type="file"]');
    if ((await input.count()) > 0) {
      await input.setInputFiles({
        name: fileName,
        mimeType: "text/plain",
        buffer: Buffer.from(`Successio E2E upload fixture ${TS}\nCustomer,Revenue\nAcme,120000\n`),
      });
      await expect(page.getByText(fileName).first()).toBeVisible({ timeout: 30_000 });

      // If it uploaded, it should show up in the vault after a reload.
      await page.goto("/vault");
      await page.reload();
      await expect(page.getByText(fileName).first()).toBeVisible({ timeout: 15_000 });
      console.log("[upload] document persisted to vault");
    } else {
      test.info().annotations.push({ type: "skip", description: "no file input on upload page" });
    }
  } catch (err) {
    test.info().annotations.push({
      type: "best-effort",
      description: `upload not verified end-to-end: ${String(err).slice(0, 120)}`,
    });
    console.warn("[upload] best-effort step did not complete:", err);
  }
});

test("8) deal room renders with score-gated profile generation", async () => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Deal Room" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /share access tiers/i })).toBeVisible();

  // A fresh account (score 0) should see the gate, not be able to generate.
  await expect(page.getByText(/reach a score of 30/i)).toBeVisible();
});

test("9) legacy book page renders its compose entry point", async () => {
  await page.goto("/legacy");
  await expect(page.getByRole("heading", { level: 1, name: "Legacy Book" })).toBeVisible();
  await expect(page.getByText("The story of your business")).toBeVisible();
  await expect(page.getByRole("button", { name: /compose the book/i })).toBeVisible();
});

test("10) session survives a cold reload, then sign out works", async () => {
  await page.goto("/dashboard");
  await page.reload();
  // Still authenticated after a full reload (cookie-backed session).
  await expect(page.getByTitle("Sign out")).toBeVisible();

  await page.getByTitle("Sign out").click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
