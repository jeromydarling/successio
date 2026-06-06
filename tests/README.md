# E2E test rig

A Playwright "real user does everything" suite that signs up a brand-new
account on the **deployed** site and clicks through every screen, verifying
that writes actually persist (reload + re-assert), then purges the account.

## Layout

| File | What it covers |
|---|---|
| `e2e/smoke.spec.ts` | Public surfaces (home, marketing, login/signup forms) + API contracts. Creates no accounts. |
| `e2e/journey.spec.ts` | The full journey: signup → dashboard → settings → history → knowledge → vault → upload → deal room → legacy → sign out. Serial, one shared account, auto-purged. |
| `e2e/app.spec.ts` | Negative paths (bad login, auth-guard redirect). Creates no accounts. |

## Running

These run against a **deployed** URL — there is no local web server.

```bash
npm run test:e2e            # all specs, both projects, vs production
npm run test:e2e:ui         # interactive UI mode
BASE_URL=https://staging.example.com npm run test:e2e   # point elsewhere
npx playwright test --list  # parse-check specs without running a browser
```

> This dev sandbox cannot run a browser (no Chromium, egress blocked). Only
> `--list` works here; the real run happens in GitHub Actions (`.github/workflows/e2e.yml`),
> which has Chromium. Don't try to run the browser locally in the sandbox.

## Env knobs

| Var | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://successio.pro` | Target site for all specs. |
| `E2E_ADMIN_TOKEN` | `successio-e2e-purge-2026` (fallback) | Token for the cleanup endpoint. Matches the server fallback so CI works without provisioning a secret; set a repo secret of the same name to override. |
| `EMAIL_VERIFICATION` | *(unset = off)* | **Server-side** flag. When not `"on"`, signup creates already-verified users and skips the confirm email, so the journey never depends on an email link. **To re-enable real email verification, set `EMAIL_VERIFICATION=on` in the Worker env — that one variable is the only change needed.** |

## How cleanup works

`journey.spec.ts` `afterAll` calls `POST /api/admin/purge-user?token=…&email=…`,
which deletes the user, their org, and every child row. The endpoint is
token-guarded **and** can only ever delete emails starting with `e2e+`, so even
with the fallback token it cannot touch a real account. Cleanup is best-effort:
the suite never fails on a cleanup error.

## Why these choices (flake-avoidance)

- **`reducedMotion: "reduce"`** in the config collapses Framer/CSS animations to
  their final state so post-navigation elements are stable and clicks don't time
  out. The app's CSS already honors `@media (prefers-reduced-motion: reduce)`.
- **Persistence by reload.** Every create/edit reloads the page and re-asserts —
  proving the data reached D1, not just React state.
- **Cross-viewport selectors.** We assert on the page `<h1>` (present in both
  desktop and mobile layouts) and never on the sidebar, which is hidden on
  mobile. Sign-out is matched via its `title` attribute (icon-only button).
- **Score-gated actions are best-effort.** A fresh account has a readiness score
  of 0, so profile/legacy generation is intentionally gated; we assert the gate
  rather than forcing an AI run.

## Porting recipe (to another app)

1. Copy `playwright.config.ts` + `tests/e2e/` and change `BASE_URL` default.
2. Add the server bits: an `EMAIL_VERIFICATION`-style signup flag (default off)
   and a token-guarded, prefix-restricted purge endpoint.
3. Re-enumerate selectors from your routes/nav. Prefer `getByRole("heading")`,
   `{ exact: true }` for short labels, and `.first()` on OR-regex locators.
4. Keep `tests/e2e` out of the app `tsconfig` includes so `npm run build` is
   unaffected.
5. Wire `.github/workflows/e2e.yml`; run `npx playwright test --list` before
   every push.
