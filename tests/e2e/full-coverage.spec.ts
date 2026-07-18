import { test, expect, type Page } from "@playwright/test";

/**
 * Full-coverage E2E: every user-facing surface added since the journey spec
 * was written, exercised against production.
 *
 *  A. Public surfaces — pricing (live Stripe links reachable), help center,
 *     terms/privacy/security, unsubscribe page.
 *  B. Fresh account — signup → onboarding checklist derives from real data
 *     (details step completes after Settings save), dismiss persists;
 *     Settings shows the private email-ingest address + billing card.
 *  C. Seeded account (draft profile + needs-review doc) —
 *     Business Data CRUD, vault review-confirm flow, deal-room
 *     draft → audit → publish → buyer link with expiry/view limit,
 *     buyer document request round-trip, stack health check.
 *  D. Superadmin CRM (runs only when SUPER_ADMIN_TOKEN is provided).
 *
 * Stripe: checkout is NOT completed in CI — these are live-mode links and
 * every completion would create a real subscription needing manual cleanup.
 * The spec verifies the links exist on the page and that Stripe serves them.
 */

test.describe.configure({ mode: "serial" });

const TS = Date.now();
const TOKEN = process.env.E2E_ADMIN_TOKEN ?? "";
const SA_TOKEN = process.env.SUPER_ADMIN_TOKEN ?? "";
const PASSWORD = "Successio-E2E-Pass-1";

// Account A: brand-new, unseeded (onboarding).
const A_EMAIL = `e2e+fullcov-fresh-${TS}@successio.pro`;
const A_BUSINESS = `E2E Fresh Shop ${TS}`;

// Account B: seeded with a DRAFT profile + a needs-review document.
const B_EMAIL = `e2e+fullcov-seed-${TS}@successio.pro`;
const B_BUSINESS = `E2E Coverage Shop ${TS}`;

let page: Page;
let buyerToken = "";

async function signup(p: Page, email: string, business: string) {
  await p.goto("/signup");
  await p.getByPlaceholder("Carl Brenner").fill("E2E Coverage User");
  await p.getByPlaceholder("carl@shop.com").fill(email);
  await p.getByPlaceholder("Brenner Precision Machining").fill(business);
  await p.getByRole("combobox").selectOption("manufacturing");
  await p.getByPlaceholder("10+ characters").fill(PASSWORD);
  await p.getByRole("button", { name: /create account/i }).click();
  await expect(p).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

async function purge(p: Page, email: string) {
  try {
    const res = await p.request.post("/api/admin/purge-user", {
      data: { token: TOKEN, email },
    });
    console.log(`[purge ${email}] ${res.status()}`);
  } catch (err) {
    console.warn(`[purge ${email}] failed:`, err);
  }
}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({
    // Skips ONLY rate limiting on auth endpoints (secret-gated server-side) —
    // CI performs many signups per run from one IP; see guardRate in auth.ts.
    extraHTTPHeaders: TOKEN ? { "x-e2e-bypass": TOKEN } : {},
  });
});

test.afterAll(async () => {
  await purge(page, A_EMAIL);
  await purge(page, B_EMAIL);
  await page.close();
});

// ── A. Public surfaces ────────────────────────────────────────────────────────

test("pricing page renders all four live Stripe payment links, and Stripe serves them", async () => {
  await page.goto("/pricing");
  const html = await page.content();
  const links = [...new Set(html.match(/buy\.stripe\.com\/[A-Za-z0-9]+/g) ?? [])];
  expect(links.length, "four payment links on the pricing page").toBe(4);

  for (const link of links) {
    const res = await page.request.get(`https://${link}`, { maxRedirects: 5 });
    expect(res.status(), `payment link ${link} reachable`).toBeLessThan(400);
  }

  // Concierge (done-for-you) section present.
  await expect(page.getByText(/prefer we do it for you/i)).toBeVisible();
});

test("help center: index, search, and article pages render", async () => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: /how everything works/i })).toBeVisible();

  // Search narrows to matching articles.
  await page.getByPlaceholder(/search the help center/i).fill("readiness");
  await expect(page.getByText(/article(s)? match/i)).toBeVisible();

  // Article page with sidebar + body.
  await page.goto("/help/share-links");
  await expect(page.getByRole("heading", { name: /share links/i }).first()).toBeVisible();
  await expect(page.getByText(/the four tiers/i)).toBeVisible();
});

test("terms, privacy, and security pages are live (not dead anchors)", async () => {
  for (const [path, marker] of [
    ["/terms", /not.*a.*business broker|document-preparation/i],
    ["/privacy", /subprocessors|what we collect/i],
    ["/security", /data isolation|encrypted in transit/i],
  ] as const) {
    await page.goto(path);
    await expect(page.getByText(marker).first(), `${path} content`).toBeVisible();
  }
});

test("unsubscribe endpoint renders the confirmation page", async () => {
  const res = await page.request.get("/api/email/unsubscribe?org=e2e-nonexistent-org");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("You're unsubscribed");
});

// ── B. Fresh account: onboarding ─────────────────────────────────────────────

test("fresh signup lands on the onboarding checklist, steps complete from real data", async () => {
  await signup(page, A_EMAIL, A_BUSINESS);

  // The getting-started card replaces the empty-dashboard moment.
  await expect(page.getByText(/let's build your business record/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("0/5 done")).toBeVisible();

  // Completing business details in Settings completes step 1 automatically.
  await page.goto("/settings");
  // Wait for the org query to hydrate the form — filling before hydration
  // gets wiped by the values sync (also fixed product-side, belt+suspenders).
  await expect(page.getByPlaceholder("Brenner Precision Machining")).toHaveValue(A_BUSINESS, { timeout: 15_000 });
  await page.getByPlaceholder("Akron, Ohio").fill("E2E City, OH");
  // exact: the description textarea's placeholder also contains "1987".
  await page.getByPlaceholder("1987", { exact: true }).fill("1990");
  await page.getByPlaceholder("31", { exact: true }).fill("12");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText("Saved!")).toBeVisible({ timeout: 15_000 });

  await page.goto("/dashboard");
  await expect(page.getByText("1/5 done")).toBeVisible({ timeout: 15_000 });

  // Dismiss persists across reload (localStorage).
  await page.getByRole("button", { name: /dismiss getting started/i }).click();
  await expect(page.getByText(/1\/5 done/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/let's build your business record/i)).toHaveCount(0);
});

test("settings surfaces the private email-ingest address and the billing card", async () => {
  await page.goto("/settings");
  await expect(page.getByText(/email documents in/i)).toBeVisible();
  await expect(page.locator("code", { hasText: "docs+" })).toBeVisible();
  await expect(page.getByText(/^Billing$/)).toBeVisible();
  await expect(page.getByRole("link", { name: /subscribe monthly/i })).toHaveAttribute(
    "href",
    /buy\.stripe\.com/
  );
  await purge(page, A_EMAIL); // done with account A
});

// ── C. Seeded account: data, review, publish, share, requests ────────────────

test("seed account B with a draft profile and a needs-review document", async () => {
  await signup(page, B_EMAIL, B_BUSINESS);
  const res = await page.request.post("/api/admin/seed-user", {
    data: { token: TOKEN, email: B_EMAIL, profileDraft: true, needsReviewDoc: true },
  });
  expect(res.ok(), `seed-user: ${res.status()}`).toBe(true);
});

test("business data: add, edit, and delete records by hand", async () => {
  await page.goto("/data");
  await expect(page.getByRole("heading", { level: 1, name: "Business Data" })).toBeVisible();

  // Seeded customers are present.
  await expect(page.getByText("Goodyear Tire & Rubber")).toBeVisible({ timeout: 15_000 });

  // Add a manual customer.
  await page.getByRole("button", { name: /add customer/i }).click();
  await page.getByPlaceholder("Acme Fabrication").fill("E2E Manual Customer");
  await page.getByPlaceholder("25").fill("12");
  await page.getByRole("button", { name: /^add$/i }).click();
  const row = page.locator("tr", { hasText: "E2E Manual Customer" });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText("Manual")).toBeVisible();

  // Edit it.
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByPlaceholder("Acme Fabrication").fill("E2E Manual Customer Renamed");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.locator("tr", { hasText: "E2E Manual Customer Renamed" })).toBeVisible({ timeout: 15_000 });

  // Delete it.
  await page
    .locator("tr", { hasText: "E2E Manual Customer Renamed" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.locator("tr", { hasText: "E2E Manual Customer Renamed" })).toHaveCount(0, { timeout: 15_000 });

  // Financials tab: add a year.
  await page.getByRole("button", { name: /financials/i }).click();
  await page.getByRole("button", { name: /add year/i }).click();
  await page.getByPlaceholder("2025").fill("2020");
  await page.getByPlaceholder("6240000").fill("4100000");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.locator("tr", { hasText: "2020" })).toBeVisible({ timeout: 15_000 });
});

test("vault: needs-review document can be confirmed reviewed", async () => {
  await page.goto("/vault");
  // Server-side status filter.
  await page.getByRole("button", { name: /needs review/i }).click();
  await page.getByText("Handwritten-Job-Log.pdf").click();

  // The review banner with the confirm action.
  await expect(page.getByText(/needs? your eyes/i)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /looks right — mark reviewed/i }).click();
  await expect(page.getByText(/needs? your eyes/i)).toHaveCount(0, { timeout: 15_000 });

  // Close the slide-over; the doc has left the needs-review filter.
  await page.keyboard.press("Escape");
  await expect(page.getByText("Handwritten-Job-Log.pdf")).toHaveCount(0, { timeout: 15_000 });
});

test("deal room: sharing is locked while draft; audit → publish unlocks it", async () => {
  await page.goto("/profile");
  await expect(page.getByText(/draft, not yet publishable/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/review before anyone else sees this/i)).toBeVisible();

  // HARD guard: creating a share link on a draft is rejected server-side.
  const [blocked] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("profiles.getShareToken"), { timeout: 15_000 }),
    page.getByRole("button", { name: /create link/i }).click(),
  ]);
  expect(blocked.status(), "draft share attempt rejected").toBeGreaterThanOrEqual(400);

  // Publish: the numeric audit either passes or lists figures to acknowledge.
  await page.getByRole("button", { name: /reviewed it — publish$/i }).click();
  const publishAnyway = page.getByRole("button", { name: /publish anyway/i });
  try {
    await publishAnyway.waitFor({ state: "visible", timeout: 10_000 });
    console.log("[publish] audit flagged figures — acknowledging");
    await publishAnyway.click();
  } catch {
    console.log("[publish] audit passed clean");
  }
  await expect(page.getByText(/draft, not yet publishable/i)).toHaveCount(0, { timeout: 15_000 });
});

test("deal room: buyer link with expiry + view limit", async () => {
  await page.goto("/profile");
  await page.getByText("Buyer Access").click();

  // Link options are visible pre-creation.
  await page.getByLabel("Expires").selectOption("30");
  await page.getByLabel("View limit").selectOption("25");
  await page.getByRole("button", { name: /create link/i }).click();

  const code = page.locator("code", { hasText: "/share/" });
  await expect(code).toBeVisible({ timeout: 15_000 });
  buyerToken = (await code.textContent())!.split("/share/")[1].trim();
  expect(buyerToken.length).toBeGreaterThan(8);

  // The live link shows its expiry + view-cap status.
  await expect(page.getByText(/expires .* · 0\/25 views used/i)).toBeVisible({ timeout: 15_000 });
});

test("buyer flow: NDA gate → full profile → document request", async ({ browser }) => {
  expect(buyerToken, "buyer token from previous step").not.toBe("");
  const ctx = await browser.newContext();
  const share = await ctx.newPage();

  await share.goto(`/share/${buyerToken}`);
  await expect(share.getByText(/confidential information/i)).toBeVisible({ timeout: 15_000 });

  // Written terms + required checkbox, then the gate (e2e orgs skip the
  // email code by design — fictional seeded data, no inbox in CI).
  await expect(share.getByText(/confidentiality agreement/i)).toBeVisible();
  await share.getByPlaceholder("Full name").fill("Bill Buyer");
  await share.getByPlaceholder("Email address").fill("bill@example.com");
  await share.getByRole("checkbox").check();
  await share.getByRole("button", { name: /i agree/i }).click();
  await expect(share.getByRole("heading", { name: /financial highlights/i })).toBeVisible({ timeout: 15_000 });

  // Buyer document request (human-in-the-loop).
  await expect(share.getByText(/need something specific/i)).toBeVisible();
  await share.getByPlaceholder("Your name").fill("Bill Buyer");
  await share.getByPlaceholder("Your email").fill("bill@example.com");
  await share
    .locator("textarea")
    .fill("E2E request: last 3 years of tax returns and the Goodyear contract.");
  await share.getByRole("button", { name: /send request to owner/i }).click();
  await expect(share.getByText(/request sent to the owner/i)).toBeVisible({ timeout: 15_000 });

  await ctx.close();
});

test("owner sees the document request and resolves it", async () => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /document requests/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/1 open/i)).toBeVisible();
  await expect(page.getByText(/E2E request: last 3 years/i)).toBeVisible();

  await page.getByRole("button", { name: /mark fulfilled/i }).click();
  await expect(page.getByText(/1 open/i)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText(/^fulfilled$/i)).toBeVisible();
});

test("stack health check passes end to end", async () => {
  // Session-authed JSON health check exercises every binding: D1, R2, KV,
  // Workers AI, Vectorize, queue, workflow, Browser Rendering, and secrets.
  const res = await page.request.get("/api/health", {
    headers: { accept: "application/json" },
  });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; checks?: { name: string; ok: boolean; detail: string }[] } | null;
  for (const c of body?.checks ?? []) {
    if (!c.ok) console.log(`[health] FAILING: ${c.name} — ${c.detail}`);
  }
  expect(res.status(), "all health checks green").toBe(200);
});

// ── D. Superadmin CRM ────────────────────────────────────────────────────────

test("superadmin: login, roster, org detail, CRM notes", async ({ browser }) => {
  test.skip(!SA_TOKEN, "SUPER_ADMIN_TOKEN not provided to the E2E environment");
  // Desktop-only: the CRM is a desktop tool, and running the wrong-token
  // probe on both projects would trip the 5-per-5-min login rate limit.
  test.skip(test.info().project.name === "mobile", "desktop-only surface");

  const ctx = await browser.newContext();
  const sa = await ctx.newPage();

  // Wrong token is rejected.
  await sa.goto("/superadmin/login");
  await sa.getByPlaceholder("Enter your admin token").fill("definitely-wrong-token");
  await sa.getByRole("button", { name: /sign in/i }).click();
  await expect(sa.getByText(/invalid token/i)).toBeVisible({ timeout: 15_000 });

  // Real token signs in to the roster.
  await sa.getByPlaceholder("Enter your admin token").fill(SA_TOKEN);
  await sa.getByRole("button", { name: /sign in/i }).click();
  await expect(sa).toHaveURL(/\/superadmin$/, { timeout: 15_000 });
  await expect(sa.getByRole("heading", { name: "Customers" })).toBeVisible();

  // Find the seeded org and open its detail page.
  await sa.getByPlaceholder(/search by name or location/i).fill(B_BUSINESS);
  await sa.locator("tr", { hasText: B_BUSINESS }).click();
  await expect(sa.getByRole("heading", { name: B_BUSINESS })).toBeVisible({ timeout: 15_000 });
  await expect(sa.getByText(/readiness score/i)).toBeVisible();

  // CRM notes: add then delete.
  await sa.getByPlaceholder("Your name").fill("E2E Admin");
  await sa.getByPlaceholder(/add a note about this customer/i).fill("E2E CRM note — safe to delete.");
  await sa.getByRole("button", { name: /add note/i }).click();
  await expect(sa.getByText("E2E CRM note — safe to delete.")).toBeVisible({ timeout: 15_000 });
  await sa.getByRole("button", { name: "Delete note" }).first().click();
  await expect(sa.getByText("E2E CRM note — safe to delete.")).toHaveCount(0, { timeout: 15_000 });

  await ctx.close();
});
