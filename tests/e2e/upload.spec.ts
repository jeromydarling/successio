import { test, expect, type Page } from "@playwright/test";

/**
 * Document upload → pipeline verification (self-contained, own account).
 *
 * Hard-verified, deterministic part: a real file uploads through the dropzone,
 * the document row is created and PERSISTS in the vault across a reload (proves
 * requestUpload + R2 put + confirmUpload + D1 — no AI involved).
 *
 * Observed part: we then poll for up to 3 minutes logging every status
 * transition. If the pipeline is healthy the document will reach "complete" or
 * "needs_review". If it stays "queued" the queue consumer is not draining
 * (check Cloudflare dashboard → Queues → document-jobs). Non-fatal on
 * "queued"; fatal on "failed".
 */

test.describe.configure({ mode: "serial" });

const TS = Date.now();
const EMAIL = `e2e+upload-${TS}@successio.pro`;
const PASSWORD = "Successio-E2E-Pass-1";
const NAME = "E2E Upload User";
const BUSINESS = `E2E Upload Shop ${TS}`;
const TOKEN = process.env.E2E_ADMIN_TOKEN ?? "";
const FILE = `e2e-customers-${TS}.csv`;

const TERMINAL = /complete|needs|failed/;

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({
    // Skips ONLY rate limiting on auth endpoints (secret-gated server-side) —
    // CI performs many signups per run from one IP; see guardRate in auth.ts.
    extraHTTPHeaders: TOKEN ? { "x-e2e-bypass": TOKEN } : {},
  });
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

test("sign up a fresh account", async () => {
  await page.goto("/signup");
  await page.getByPlaceholder("Carl Brenner").fill(NAME);
  await page.getByPlaceholder("carl@shop.com").fill(EMAIL);
  await page.getByPlaceholder("Brenner Precision Machining").fill(BUSINESS);
  await page.getByRole("combobox").selectOption("manufacturing");
  await page.getByPlaceholder("10+ characters").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
});

test("upload a document: persists (hard) + pipeline status (observed)", async () => {
  test.setTimeout(240_000);

  await page.goto("/upload");
  await expect(page.getByRole("heading", { level: 1, name: "Upload Documents" })).toBeVisible();

  // A real CSV (an accepted type — text/plain is rejected by the dropzone).
  const csv =
    "Customer,Annual Revenue,Contract Status\n" +
    "Goodyear Tire & Rubber,1750000,active\n" +
    "Parker Hannifin,1050000,active\n" +
    "Timken Company,620000,month-to-month\n";
  await page.locator('input[type="file"]').setInputFiles({
    name: FILE,
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  // HARD: the upload completes in the UI (the row shows the filename).
  await expect(page.getByText(FILE).first()).toBeVisible({ timeout: 30_000 });

  // HARD: the document row persists to the vault across a reload.
  await page.goto("/vault");
  await expect(page.getByText(FILE).first()).toBeVisible({ timeout: 30_000 });

  // OBSERVE: poll the status pill briefly, logging transitions. (Prod currently
  // leaves it "queued"; if the pipeline is brought online we'll see it advance.)
  const card = page.locator("article", { hasText: FILE }).first();
  let last = "";
  const start = Date.now();
  const deadline = start + 180_000;
  while (Date.now() < deadline) {
    const txt = (await card.innerText().catch(() => "")) || "";
    const m = txt.match(/complete|needs[ _]?review|failed|embedding|extracting|ocr|queued/i);
    const status = m ? m[0].toLowerCase().replace(/_/g, " ") : "(unknown)";
    if (status !== last) {
      console.log(`[upload-pipeline] status=${status} (+${Math.round((Date.now() - start) / 1000)}s)`);
      last = status;
    }
    if (TERMINAL.test(status)) break;
    await page.waitForTimeout(5000);
    await page.reload();
  }
  console.log(`[upload-pipeline] FINAL status=${last}`);
  test.info().annotations.push({ type: "upload-pipeline", description: `final status: ${last}` });

  // Hard: the document persists and is in a valid (non-failed) state.
  await expect(page.getByText(FILE).first()).toBeVisible();
  expect(last, "pipeline ended in a failed state").not.toMatch(/failed/);
});
