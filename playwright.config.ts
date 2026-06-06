import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config — runs against the DEPLOYED site (not a local dev server).
 * Override the target with BASE_URL (the e2e.yml workflow passes it).
 *
 * reducedMotion:"reduce" collapses Framer/CSS animations to their final state,
 * so post-navigation elements are immediately stable and .click() never times
 * out waiting for an element to stop moving.
 */
const BASE_URL = process.env.BASE_URL || "https://successio.pro";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  // Headroom for the best-effort AI steps (profile generate, legacy compose):
  // their inner waits can run ~90s, and a test-level timeout isn't catchable,
  // so it must exceed those waits.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
