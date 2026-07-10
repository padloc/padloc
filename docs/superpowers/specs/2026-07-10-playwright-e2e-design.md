# Playwright E2E Design

**Date:** 2026-07-10  
**Status:** Approved design, ready for implementation planning  
**Related:** Cypress suite under `cypress/` (to be removed); CI in `.github/workflows/ci.yml`

## Summary

Replace the legacy Cypress e2e suite with **Playwright**, covering **Padloc v4 PWA + server only**. E2E becomes a **required** CI gate on every PR. **v3 client compatibility is out of scope** and will be deleted with Cypress. Admin, extension, and desktop targets remain out of scope.

All repository artifacts must be in English per `AGENTS.md`.

## Goals

- Catch production-class UI failures (including “app never mounts” after Vite module load).
- Preserve the valuable v4 user journeys from Cypress: signup, login, lock/unlock, create item, search, and server HTTP smoke.
- Run e2e as a **required** job in `.github/workflows/ci.yml` alongside lint/build/unit.
- Use a maintainable root-level Playwright layout and shared helpers for Shadow DOM + maildev.
- Remove Cypress, v3 fixtures, and the non-required `e2e.yml` workflow in the **same** delivery.

## Non-goals

- v3 client compatibility tests or fixtures.
- Admin e2e.
- Extension / Electron / Cordova / Tauri e2e.
- Multi-browser matrix (Firefox/WebKit) in the first delivery — **Chromium only**.
- Large-scale `data-testid` refactor of the app (allowed opportunistically later).
- Visual regression / accessibility audits.
- Hardening work unrelated to e2e.

## Decisions (from design review)

| Decision | Choice |
|----------|--------|
| Scope of first delivery | Full Cypress **v4** replacement in one PR (not smoke-only) |
| CI placement | Required `e2e` job in `ci.yml` |
| Clients | PWA UI + server API only |
| Email codes | Keep **maildev** (SMTP + REST) |
| Tooling layout | Root Playwright project (not a separate workspace package) |
| v3-compat | Delete; not migrated |
| Browsers in CI | Chromium only |

## Architecture

```
pnpm run test:e2e
        │
        ├─ maildev          (:1025 SMTP, :1080 REST)
        ├─ server + PWA     (memory DB, SW disabled, SMTP → maildev)
        │     PWA :8080, API :3000
        └─ playwright test  (Chromium, baseURL http://localhost:8080)
```

### Stack process model

Mirror the current Cypress orchestration, **without** the v3 static client:

1. Start maildev.
2. Start app stack with env:
   - `PL_DATA_BACKEND=memory`
   - `PL_DISABLE_SW=true`
   - `PL_EMAIL_BACKEND=smtp`
   - `PL_EMAIL_SMTP_HOST=localhost`
   - `PL_EMAIL_SMTP_PORT=1025`
   - `PL_EMAIL_SMTP_IGNORE_TLS=true`
3. Wait until PWA port `:8080` is ready (and server `:3000` for API specs).
4. Run Playwright.
5. Tear down on completion (`concurrently --kill-others` or equivalent).

Production-style start (`pnpm start` = PWA build + server + static PWA serve) is the default for CI to match deploy artifacts. Dev mode (`test:e2e:dev`) may use `pnpm dev` / Vite for interactive debugging.

### Repository layout

```
playwright.config.ts
e2e/
  smoke.spec.ts
  auth.spec.ts
  items.spec.ts
  server.spec.ts
  helpers/
    reset.ts      # cookies, localStorage, IndexedDB
    mail.ts       # clearEmails, getCodeFromEmail (maildev REST)
    shadow.ts     # pierce Lit shadow roots / nested custom elements
    auth.ts       # signup, login, lock, unlock flows
```

Optional later: `e2e/fixtures/` for static test assets (not v3 client bundles).

### Tooling

| Piece | Choice |
|-------|--------|
| Runner | `@playwright/test` (pin current stable at implementation time) |
| Browser | Chromium (install via `playwright install --with-deps chromium` in CI) |
| Mail | Existing `maildev` dependency |
| Orchestration | `concurrently` + `wait-on` (already in root) |
| Config | `playwright.config.ts` at repo root |
| baseURL | `http://localhost:8080` |
| Server URL (API tests) | `http://localhost:3000` |

## Test plan

### smoke.spec.ts

- Visit `/`.
- Assert `pl-app` is attached in the document (mounted custom element).
- Assert login shell is usable (e.g. `pl-login-signup` and/or `#emailInput` visible/interactable).

**Purpose:** Fail fast on blank page / eternal spinner / broken module entry / CSP blocking scripts. This would have caught the Vite `window.onload` mount bug.

### auth.spec.ts

Port Cypress `01 - signup-login` behavior:

1. **Signup** — random email → submit → read 6-digit code from maildev → name + TOS → choose own master password → confirm weak password if prompted → success → land on `/items`.
2. **Login** — clear client state → same email → code → password → accept trusted device if prompted → `/items`.
3. **Lock / unlock** — open menu → lock → `/unlock` → unlock with password → `/items`.

Shared password/name values come from env (see Configuration).

### items.spec.ts

Port Cypress `02 - items` behavior (v4 UI only):

1. Signup (or reuse auth helper).
2. Create item: open create flow → fill name / username / password / URL → save → URL is an item route, not `/new`.
3. Search: filter by a known substring → one hit with expected name; filter by nonexistent term → empty state message.

### server.spec.ts

Port Cypress `04 - server` HTTP checks against `http://localhost:3000` (no browser UI required; Playwright `request` context is fine):

| Request | Expectation |
|---------|-------------|
| GET `/` | 405 |
| PUT `/` | 405 |
| OPTIONS `/` | success (CORS preflight path) |
| POST `/` without JSON body | 400 |
| POST JSON without valid RPC shape | 200 + `error.code === "invalid_request"` |
| POST `getAuthInfo` without session | 200 + `error.code === "invalid_session"` |

Exact body shapes should match current server responses (version field may differ from Cypress hard-coded `4.0.0` — assert stable fields: `kind`, `error.code`, not necessarily frozen version string unless still accurate).

### Explicitly not ported

- All `v3_*` flows and `03 - v3-compatibility.cy.ts`.
- Admin UI.
- Any test that depends on `cypress/fixtures/v3-client`.

## Helpers & selectors

### Helpers

| Helper | Responsibility |
|--------|----------------|
| `reset` | Clear cookies, localStorage, IndexedDB between auth scenarios |
| `mail` | `DELETE http://localhost:1080/email/all`; poll `GET http://localhost:1080/email` for latest message; extract `(\d{6})` |
| `shadow` | Navigate into nested custom elements / shadow roots (Lit) |
| `auth` | High-level signup/login/lock/unlock using stable selectors where possible |

### Selector strategy

**Prefer (stable):**

- Custom element tags: `pl-app`, `pl-login-signup`, `pl-items`, `pl-items-list`, `pl-item-view`, …
- Existing element ids: `#emailInput`, `#submitEmailButton`, `#loginPasswordInput`, `#unlockButton`, …

**Accept temporarily (fragile, matches Cypress):**

- Ordinal selectors (`nth` button/drawer) only where the UI has no id/role.
- Do **not** block the first PR on a full `data-testid` campaign. Follow-up: add testids when a flow flakes or UI is touched.

**Shadow DOM:** Playwright must pierce open shadow roots consistently (shared helper, not ad-hoc per test).

### Flake control

- Prefer waiting on URL / locator state over fixed `wait(ms)`.
- Poll maildev for codes with a bounded timeout.
- Keep animations in mind; wait for actionable elements.
- Single worker or low parallelism if shared server state conflicts (memory backend + one app instance — default to **serial** e2e or one worker unless proven safe).

## Scripts & package.json

| Script | Behavior |
|--------|----------|
| `test:e2e` | Start maildev + server/PWA (CI-like), wait for readiness, `playwright test` |
| `test:e2e:dev` | Start stack (dev-friendly), open Playwright UI or headed mode |
| ~~`start:v3`~~ | **Remove** |
| Cypress scripts | **Remove** |

Root dependencies:

- **Add:** `@playwright/test`
- **Remove:** `cypress`
- **Keep:** `maildev`, `concurrently`, `wait-on`, `http-server` (still used by PWA `start`)

Update `pnpm-workspace.yaml` if it still lists a `cypress` workspace path only for Cypress.

## CI integration

### `.github/workflows/ci.yml`

Add required job `e2e`:

1. checkout, pnpm, Node from `.nvmrc`
2. `pnpm install --frozen-lockfile`
3. `pnpm exec playwright install --with-deps chromium`
4. `pnpm run test:e2e`

Job runs on the same triggers as other CI jobs (`pull_request`, `push` to `main`). It is a **merge gate** (required status check — document for branch protection if not already covering new job name).

### Remove

- `.github/workflows/e2e.yml` (label/nightly/manual Cypress workflow)

### Artifacts (recommended)

On failure, upload Playwright HTML report / test traces as CI artifacts to speed debugging. Not required for green path.

## Deletion checklist (same PR)

- [ ] `cypress/` tree (specs, support, plugins, fixtures including `v3-client`)
- [ ] `cypress.config.ts`, `cypress.env.json`
- [ ] Root `cypress` dependency
- [ ] `start:v3` script and any v3-only docs references
- [ ] `.github/workflows/e2e.yml`
- [ ] README / CONTRIBUTING e2e instructions → Playwright
- [ ] Biome ignore entries that only existed for Cypress fixtures (if any become unused)

## Configuration

Playwright / test env (via `playwright.config.ts` and/or env vars; no committed secrets):

| Key | Example | Use |
|-----|---------|-----|
| baseURL | `http://localhost:8080` | PWA |
| `E2E_SERVER_URL` or equivalent | `http://localhost:3000` | API smoke |
| password / name | same defaults as old `cypress.env.json` (`password`, `The Dude`) | auth flows |
| maildev REST | `http://localhost:1080` | codes |

Do not commit production credentials. Local defaults for disposable test users only.

## Documentation updates

- `README.md` — replace Cypress run instructions with Playwright.
- `CONTRIBUTING.md` — `pnpm run test:e2e` / `test:e2e:dev`, note `playwright install` for local browsers.
- This design lives at `docs/superpowers/specs/2026-07-10-playwright-e2e-design.md`.
- Implementation plan (next): `docs/superpowers/plans/2026-07-10-playwright-e2e.md`.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Shadow DOM / Lit selector flake | Shared pierce helpers; prefer ids; serial runs |
| maildev race | Poll with timeout; clear inbox before signup/login |
| CI duration | Chromium only; one stack; avoid extra builds if artifacts reusable |
| Fragile ordinal selectors | Port first for parity; harden when flaking |
| Local missing browser binary | Document `pnpm exec playwright install`; CI is source of truth |
| Server response version field drift | Assert stable error codes/kinds, not frozen marketing version unless verified |
| Branch protection still points at old `e2e` check name | After merge, ensure required check is the new `ci.yml` job name |

## Success criteria

1. `pnpm run test:e2e` green locally (with Playwright browser installed) and in GitHub Actions.
2. Required CI includes green `e2e` on PRs to `main`.
3. Smoke fails if `pl-app` never mounts.
4. Auth + items flows pass against memory server + maildev.
5. Server HTTP smoke passes.
6. No Cypress or v3 e2e fixtures remain in the repo.
7. Docs describe Playwright only for e2e.

## Implementation order (preview)

1. Add Playwright config + deps; skeleton smoke spec.
2. Stack scripts without v3; wire CI job (can be temporary non-blocking only if needed mid-PR — final state is required).
3. Port mail + shadow + auth helpers; auth + items specs.
4. Port server API smoke.
5. Delete Cypress/v3/e2e.yml; update docs.
6. Verify full `test:e2e` and CI green; open PR.

Detailed step-by-step plan will be written after this spec is approved in-repo.
