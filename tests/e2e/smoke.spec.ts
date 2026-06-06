import { test, expect } from "@playwright/test";

/**
 * Public, unauthenticated smoke checks — every surface a visitor sees without
 * an account, plus API contract checks via the request fixture. Creates no
 * accounts, so it's safe to run anywhere.
 */

test.describe("public marketing surfaces", () => {
  test("home loads with title, hero, and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Successio/i);
    // Hero <h1> is split across animated word-spans; "legacy" is contiguous.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /legacy/i })).toBeVisible();

    // Primary CTA routes to signup.
    await page.getByRole("link", { name: /start your profile/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: /start your profile/i })).toBeVisible();
  });

  test("marketing nav pages render", async ({ page }) => {
    for (const path of ["/why", "/partners", "/compare", "/pricing", "/demo"]) {
      const res = await page.goto(path);
      expect(res?.status(), `GET ${path}`).toBeLessThan(400);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("login and signup pages render their forms", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/owner@/i)).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /start your profile/i })).toBeVisible();
    await expect(page.getByPlaceholder("carl@shop.com")).toBeVisible();
  });
});

test.describe("API contracts", () => {
  test("GET /api/health requires auth (401)", async ({ request }) => {
    // The health endpoint exercises every binding but is session-guarded — an
    // unauthenticated probe must be rejected, not leak stack details.
    const res = await request.get("/api/health");
    expect(res.status()).toBe(401);
  });

  test("share endpoint rejects an unknown token", async ({ request }) => {
    const res = await request.get("/api/share/definitely-not-a-real-token");
    expect(res.status()).toBeLessThan(500);
    const body = await res.json().catch(() => ({}));
    expect(body).toHaveProperty("error");
  });

  test("purge endpoint is token-guarded", async ({ request }) => {
    // No token → forbidden. Proves the cleanup endpoint can't be hit anonymously.
    const res = await request.post("/api/admin/purge-user?email=e2e%2Bnobody@successio.pro");
    expect([403, 404]).toContain(res.status());
  });
});
