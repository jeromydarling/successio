import { test, expect } from "@playwright/test";

/**
 * Negative / unhappy paths. These create no accounts and require no cleanup —
 * they just prove the app rejects bad input and guards authenticated routes.
 */

test("bad login shows an error and does not sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder(/owner@/i).fill("e2e+nobody@successio.pro");
  // Password inputs have no "textbox" role — target by type.
  await page.locator('input[type="password"]').fill("wrong-password-123");
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Stays on /login and surfaces an error; no redirect to the app.
  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("authenticated route redirects an anonymous visitor to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/dashboard");
  // Middleware/guard bounces an unauthenticated user to the login page.
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
