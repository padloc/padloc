# Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cypress with Playwright for Padloc v4 PWA + server e2e, make e2e a required CI gate, and delete Cypress/v3 fixtures.

**Architecture:** Root Playwright project (`playwright.config.ts` + `e2e/`). CI/local `test:e2e` starts maildev + memory server + built PWA, then runs Chromium specs (smoke, auth, items, server). Shared helpers pierce Lit shadow DOM and read email codes from maildev. Cypress and v3-compat are removed in the same PR.

**Tech Stack:** `@playwright/test` (current stable at implement time), Chromium, maildev, concurrently, wait-on, pnpm 10.15.0, Node 24, GitHub Actions.

## Global Constraints

- English-only repository artifacts (`AGENTS.md`).
- Spec: `docs/superpowers/specs/2026-07-10-playwright-e2e-design.md` (must already be on the branch or merged).
- **No v3-compat**, no Admin e2e, Chromium only.
- Soft-focus packages (electron/tauri/cordova) untouched.
- Do not include untracked `docs/superpowers/backlog.md`.
- Open PR; wait for GitHub `lint` / `build` / `unit` / `e2e`; inspect CodeRabbit/Cubic unless user says skip.
- Prefer waiting on URL/locator state over fixed `wait(ms)`.
- Serial e2e workers (`workers: 1`) unless proven safe otherwise.

## File map

| Path | Role |
|------|------|
| `playwright.config.ts` | Playwright config: baseURL, Chromium, serial, timeouts, testDir |
| `e2e/helpers/reset.ts` | Clear cookies / localStorage / IndexedDB |
| `e2e/helpers/mail.ts` | maildev REST clear + poll 6-digit code |
| `e2e/helpers/shadow.ts` | Chain locators through nested custom elements |
| `e2e/helpers/auth.ts` | signup / login / lock / unlock flows |
| `e2e/helpers/env.ts` | Test password/name/server URL defaults |
| `e2e/smoke.spec.ts` | Mount + login shell |
| `e2e/auth.spec.ts` | Signup / login / lock-unlock |
| `e2e/items.spec.ts` | Create item + search |
| `e2e/server.spec.ts` | HTTP API smoke on `:3000` |
| `package.json` | deps + `test:e2e` / `test:e2e:dev`; remove Cypress/`start:v3` |
| `pnpm-workspace.yaml` | Remove `cypress` entry |
| `.github/workflows/ci.yml` | Add required `e2e` job |
| `.github/workflows/e2e.yml` | Delete |
| `cypress/**`, `cypress.config.ts`, `cypress.env.json` | Delete |
| `biome.json` | Drop `!**/cypress/fixtures` ignore if unused |
| `README.md`, `CONTRIBUTING.md` | Playwright instructions |

---

### Task 1: Branch, Playwright dependency, config, smoke skeleton

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Create: `e2e/helpers/env.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (via install)
- Modify: `pnpm-workspace.yaml` (remove cypress path only if still listed; full Cypress delete is Task 6 — for Task 1 keep Cypress until scripts switch, or remove path when deleting)

**Interfaces:**
- Produces: `e2eEnv` from `e2e/helpers/env.ts`:
  - `password: string` default `"password"`
  - `name: string` default `"The Dude"`
  - `serverUrl: string` default `"http://localhost:3000"`
  - `maildevUrl: string` default `"http://localhost:1080"`
  - `baseURL: string` default `"http://localhost:8080"`

- [ ] **Step 1: Create branch from latest main**

```bash
git checkout main
git pull origin main
git checkout -b test/playwright-e2e
```

If the design spec commit is only on `docs/playwright-e2e-design`, cherry-pick or merge it first:

```bash
git cherry-pick b6ca52b0
# or: git merge origin/docs/playwright-e2e-design
```

Ensure `docs/superpowers/specs/2026-07-10-playwright-e2e-design.md` exists on the branch.

- [ ] **Step 2: Install Playwright and remove Cypress package**

```bash
PLAYWRIGHT_VERSION=$(npm view @playwright/test version)
pnpm add -D -w "@playwright/test@${PLAYWRIGHT_VERSION}"
pnpm remove -w cypress
pnpm exec playwright install chromium
```

Record the exact `@playwright/test` version from `package.json` in the PR body.

- [ ] **Step 3: Write `e2e/helpers/env.ts`**

```ts
export const e2eEnv = {
    password: process.env.E2E_PASSWORD || "password",
    name: process.env.E2E_NAME || "The Dude",
    serverUrl: process.env.E2E_SERVER_URL || "http://localhost:3000",
    maildevUrl: process.env.E2E_MAILDEV_URL || "http://localhost:1080",
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8080",
};
```

- [ ] **Step 4: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";
import { e2eEnv } from "./e2e/helpers/env";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: e2eEnv.baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "off",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
```

- [ ] **Step 5: Write failing/minimal `e2e/smoke.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
    test("mounts pl-app and shows login shell", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("pl-app")).toBeAttached({ timeout: 30_000 });
        const emailInput = page.locator("pl-app").locator("pl-login-signup").locator("#emailInput");
        await expect(emailInput).toBeVisible({ timeout: 30_000 });
    });
});
```

Playwright pierces open shadow roots when chaining locators (`pl-app` → `pl-login-signup` → `#emailInput`).

- [ ] **Step 6: Point package scripts at Playwright (keep stack start; drop v3)**

In root `package.json`:

1. Remove script `start:v3`.
2. Replace e2e scripts:

```json
"test:e2e": "concurrently --prefix=name --prefix-length=30 --kill-others --success=first -n app,maildev,playwright \"PL_DATA_BACKEND=memory PL_DISABLE_SW=true PL_EMAIL_BACKEND=smtp PL_EMAIL_SMTP_HOST=localhost PL_EMAIL_SMTP_PORT=1025 PL_EMAIL_SMTP_IGNORE_TLS=true pnpm start\" \"npx maildev\" \"./node_modules/.bin/wait-on tcp:localhost:8080 tcp:localhost:3000 && playwright test\"",
"test:e2e:dev": "concurrently --prefix=name --prefix-length=30 --kill-others --success=first -n app,maildev,playwright \"PL_DATA_BACKEND=memory PL_DISABLE_SW=true PL_EMAIL_BACKEND=smtp PL_EMAIL_SMTP_HOST=localhost PL_EMAIL_SMTP_PORT=1025 PL_EMAIL_SMTP_IGNORE_TLS=true pnpm run dev\" \"npx maildev\" \"./node_modules/.bin/wait-on tcp:localhost:8080 tcp:localhost:3000 && playwright test --ui\""
```

3. Ensure `cypress` is gone from `devDependencies`.
4. In `pnpm-workspace.yaml`, remove the `- cypress` line if present.

- [ ] **Step 7: Sanity-check smoke (optional if browser available)**

```bash
pnpm run test:e2e -- e2e/smoke.spec.ts
```

Expected: smoke passes when stack + Chromium work. If local browser install fails, continue; CI will validate. Do not skip writing the spec.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml playwright.config.ts e2e/helpers/env.ts e2e/smoke.spec.ts
git commit -m "test: scaffold Playwright e2e with smoke mount check"
```

---

### Task 2: Helpers — reset, mail, shadow

**Files:**
- Create: `e2e/helpers/reset.ts`
- Create: `e2e/helpers/mail.ts`
- Create: `e2e/helpers/shadow.ts`

**Interfaces:**
- Consumes: `e2eEnv.maildevUrl`
- Produces:
  - `resetClientState(page: Page): Promise<void>`
  - `clearEmails(): Promise<void>`
  - `getCodeFromEmail(options?: { timeout?: number }): Promise<string>`
  - `deep(page: Page, ...selectors: string[]): Locator`
  - `typeIn(locator: Locator, text: string): Promise<void>` — types into inner `input, textarea`

- [ ] **Step 1: Write `e2e/helpers/reset.ts`**

```ts
import type { Page } from "@playwright/test";

export async function resetClientState(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(async () => {
        localStorage.clear();
        sessionStorage.clear();
        const dbs = await indexedDB.databases();
        await Promise.all(
            dbs.map(
                (db) =>
                    new Promise<void>((resolve, reject) => {
                        if (!db.name) {
                            resolve();
                            return;
                        }
                        const req = indexedDB.deleteDatabase(db.name);
                        req.onsuccess = () => resolve();
                        req.onerror = () => reject(req.error);
                        req.onblocked = () => resolve();
                    })
            )
        );
    });
}
```

- [ ] **Step 2: Write `e2e/helpers/mail.ts`**

```ts
import { e2eEnv } from "./env";

type MaildevEmail = {
    time: string | number;
    text?: string;
    html?: string;
};

export async function clearEmails(): Promise<void> {
    const res = await fetch(`${e2eEnv.maildevUrl}/email/all`, { method: "DELETE" });
    if (!res.ok && res.status !== 200) {
        throw new Error(`maildev clear failed: ${res.status}`);
    }
}

export async function getCodeFromEmail(options: { timeout?: number } = {}): Promise<string> {
    const timeout = options.timeout ?? 30_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
        const res = await fetch(`${e2eEnv.maildevUrl}/email`);
        if (res.ok) {
            const emails = (await res.json()) as MaildevEmail[];
            const latest = [...emails].sort((a, b) => (a.time > b.time ? -1 : 1))[0];
            const body = `${latest?.text || ""}\n${latest?.html || ""}`;
            const match = body.match(/(\d{6})/);
            if (match?.[1]) {
                return match[1];
            }
        }
        await new Promise((r) => setTimeout(r, 500));
    }

    throw new Error("Timed out waiting for email verification code from maildev");
}
```

- [ ] **Step 3: Write `e2e/helpers/shadow.ts`**

```ts
import type { Locator, Page } from "@playwright/test";

/** Chain locators; Playwright pierces open shadow roots between custom elements. */
export function deep(page: Page, ...selectors: string[]): Locator {
    if (selectors.length === 0) {
        throw new Error("deep() requires at least one selector");
    }
    let loc = page.locator(selectors[0]);
    for (let i = 1; i < selectors.length; i++) {
        loc = loc.locator(selectors[i]);
    }
    return loc;
}

export async function typeIn(host: Locator, text: string): Promise<void> {
    const field = host.locator("input, textarea").first();
    await field.fill(text);
}
```

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers/reset.ts e2e/helpers/mail.ts e2e/helpers/shadow.ts
git commit -m "test: add Playwright e2e helpers for reset, mail, shadow"
```

---

### Task 3: Auth helpers + auth.spec.ts

**Files:**
- Create: `e2e/helpers/auth.ts`
- Create: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `resetClientState`, `clearEmails`, `getCodeFromEmail`, `deep`, `typeIn`, `e2eEnv`
- Produces:
  - `signup(page: Page, email: string): Promise<void>`
  - `login(page: Page, email: string): Promise<void>`
  - `lock(page: Page): Promise<void>`
  - `unlock(page: Page, email: string): Promise<void>`

Port behavior from `cypress/support/commands.ts` (v4 only: `signup`, `login`, `lock`, `unlock`).

- [ ] **Step 1: Write `e2e/helpers/auth.ts`**

```ts
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { e2eEnv } from "./env";
import { clearEmails, getCodeFromEmail } from "./mail";
import { resetClientState } from "./reset";
import { deep, typeIn } from "./shadow";

export async function signup(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();
    await page.goto("/");

    const login = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await typeIn(login.locator("#emailInput"), email);
    await login.locator("#submitEmailButton").click({ force: true });

    const prompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(prompt).toBeVisible({ timeout: 15_000 });
    const code = await getCodeFromEmail();
    await typeIn(prompt.locator("pl-input").first(), code);
    await prompt.locator("#confirmButton").click({ force: true });

    await expect(page).toHaveURL(/authToken/, { timeout: 30_000 });

    // Name + TOS (drawer indices match current Cypress flow)
    await typeIn(login.locator("pl-drawer").nth(2).locator("pl-input").first(), e2eEnv.name);
    await login.locator("pl-drawer").nth(2).locator("input#tosCheckbox").click({ force: true });
    await login.locator("pl-button").nth(2).click({ force: true });

    // Choose a different password
    await login.locator("pl-drawer").nth(5).locator("pl-button").nth(1).click({ force: true });

    const alert = deep(page, "pl-app", "pl-alert-dialog");
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await alert.locator("pl-button").nth(2).click({ force: true });

    const masterPrompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(masterPrompt).toBeVisible({ timeout: 10_000 });
    await typeIn(masterPrompt.locator("pl-input[label='Enter Master Password']"), e2eEnv.password);
    await masterPrompt.locator("#confirmButton").click({ force: true });

    // Confirm weak password
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await alert.locator("pl-button").nth(1).click({ force: true });

    await login.locator("pl-drawer").nth(5).locator("pl-button").nth(3).click({ force: true });
    await typeIn(login.locator("pl-drawer").nth(6).locator("pl-password-input#repeatPasswordInput"), e2eEnv.password);
    await login.locator("pl-drawer").nth(6).locator("pl-button#confirmPasswordButton").click({ force: true });

    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 30_000 });
    await login.locator("pl-drawer").nth(7).locator("pl-button").click({ force: true });
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}

export async function login(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();
    await page.goto("/");

    const loginView = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await typeIn(loginView.locator("#emailInput"), email);
    await loginView.locator("#submitEmailButton").click({ force: true });

    const prompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(prompt).toBeVisible({ timeout: 15_000 });
    const code = await getCodeFromEmail();
    await typeIn(prompt.locator("pl-input").first(), code);
    await prompt.locator("#confirmButton").click({ force: true });

    await expect(page).toHaveURL(/authToken/, { timeout: 30_000 });

    await typeIn(loginView.locator("pl-drawer").nth(3).locator("pl-password-input#loginPasswordInput"), e2eEnv.password);
    await loginView.locator("pl-drawer").nth(3).locator("pl-button#loginButton").click({ force: true });

    const alert = deep(page, "pl-app", "pl-alert-dialog");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await alert.locator("pl-button").nth(0).click({ force: true });

    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}

export async function lock(page: Page): Promise<void> {
    await page.goto("/");
    const list = deep(page, "pl-app", "pl-items", "pl-items-list");
    await list.locator("pl-button.menu-button").first().click({ force: true });
    const menu = deep(page, "pl-app", "pl-menu");
    await menu.locator("pl-button.menu-footer-button").first().click({ force: true });
    await expect(page).toHaveURL(/\/unlock/, { timeout: 15_000 });
}

export async function unlock(page: Page, email: string): Promise<void> {
    await page.goto("/");
    const unlockView = deep(page, "pl-app", "pl-start", "pl-unlock");
    await expect(unlockView.locator("pl-input[label='Logged In As']").locator("input")).toHaveValue(email, {
        timeout: 15_000,
    });
    await typeIn(unlockView.locator("pl-password-input#passwordInput"), e2eEnv.password);
    await unlockView.locator("pl-button#unlockButton").click({ force: true });
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}
```

If drawer/button indices fail against current UI, adjust to match live DOM (inspect with Playwright trace/UI). Prefer ids when available. Do not reintroduce v3 helpers.

- [ ] **Step 2: Write `e2e/auth.spec.ts`**

```ts
import { test } from "@playwright/test";
import { lock, login, signup, unlock } from "./helpers/auth";

test.describe("Signup/Login", () => {
    const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

    test("can signup without errors", async ({ page }) => {
        await signup(page, email);
    });

    test("can login without errors", async ({ page }) => {
        await login(page, email);
    });

    test("can lock/unlock without errors", async ({ page }) => {
        await login(page, email);
        await lock(page);
        await unlock(page, email);
    });
});
```

Note: tests share `email` and run serially (`workers: 1`). Order matters (signup before login).

- [ ] **Step 3: Run auth specs against local stack**

```bash
pnpm run test:e2e -- e2e/auth.spec.ts
```

Expected: 3 passed. If a step fails on selector, fix `auth.ts` selectors using Playwright UI (`test:e2e:dev`) or trace; keep flow semantics identical to Cypress.

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers/auth.ts e2e/auth.spec.ts
git commit -m "test: port signup/login/lock Playwright e2e flows"
```

---

### Task 4: items.spec.ts

**Files:**
- Create: `e2e/items.spec.ts`

**Interfaces:**
- Consumes: `signup`, `unlock`, `deep`, `typeIn` from helpers

- [ ] **Step 1: Write `e2e/items.spec.ts`**

Port `cypress/e2e/02 - items.cy.ts`:

```ts
import { expect, test } from "@playwright/test";
import { signup, unlock } from "./helpers/auth";
import { deep, typeIn } from "./helpers/shadow";

const testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

const itemSearch = {
    existing: "secret",
    nonexistent: "apple",
};

const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

test.describe("Items", () => {
    test("can create an item without errors", async ({ page }) => {
        await signup(page, email);

        const list = deep(page, "pl-app", "pl-items", "pl-items-list");
        await list.locator("pl-button").nth(2).click({ force: true });

        const createDialog = deep(page, "pl-app", "pl-create-item-dialog");
        await createDialog.locator("footer pl-button.primary").click({ force: true });

        await expect(page).toHaveURL(/\/items\//);
        await expect(page).toHaveURL(/\/new/);

        const itemView = deep(page, "pl-app", "pl-items", "pl-item-view");
        await typeIn(itemView.locator("pl-input#nameInput"), testItem.name);
        await typeIn(itemView.locator("pl-scroller pl-list pl-field").nth(0).locator("pl-input.value-input"), testItem.username);
        await typeIn(itemView.locator("pl-scroller pl-list pl-field").nth(1).locator("pl-input.value-input"), testItem.password);
        await typeIn(itemView.locator("pl-scroller pl-list pl-field").nth(2).locator("pl-input.value-input"), testItem.url);
        await itemView.locator("pl-button.primary").click({ force: true });

        await expect(page).toHaveURL(/\/items\//);
        await expect(page).not.toHaveURL(/\/new/);
    });

    test("can find an item without errors", async ({ page }) => {
        await unlock(page, email);

        const list = deep(page, "pl-app", "pl-items", "pl-items-list");
        await list.locator("pl-button").nth(3).click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), itemSearch.existing);

        const rows = list.locator("main pl-virtual-list pl-scroller div.content > div");
        await expect(rows).toHaveCount(1);
        await expect(list.locator("pl-vault-item-list-item div.semibold").first()).toContainText(testItem.name);

        await list.locator("pl-input#filterInput pl-button.slim").click({ force: true });
        await list.locator("pl-button").nth(3).click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), itemSearch.nonexistent);

        await expect(list.locator("main > div.centering")).toContainText("did not match any items");
    });
});
```

- [ ] **Step 2: Run items specs**

```bash
pnpm run test:e2e -- e2e/items.spec.ts
```

Expected: 2 passed. Fix selectors if UI differs slightly from Cypress-era DOM.

- [ ] **Step 3: Commit**

```bash
git add e2e/items.spec.ts
git commit -m "test: port items create/search Playwright e2e"
```

---

### Task 5: server.spec.ts

**Files:**
- Create: `e2e/server.spec.ts`

**Interfaces:**
- Consumes: `e2eEnv.serverUrl`
- Uses Playwright `request` fixture (no browser UI)

- [ ] **Step 1: Write `e2e/server.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { e2eEnv } from "./helpers/env";

test.describe("Server", () => {
    const serverUrl = e2eEnv.serverUrl;

    test("responds correctly to valid and invalid requests", async ({ request }) => {
        expect((await request.get(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(405);
        expect((await request.put(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(405);
        expect((await request.fetch(`${serverUrl}/`, { method: "OPTIONS" })).ok()).toBeTruthy();

        expect((await request.post(`${serverUrl}/`, { failOnStatusCode: false })).status()).toBe(400);

        const invalid = await request.post(`${serverUrl}/`, {
            headers: { "Content-Type": "application/json" },
            data: { email: "user@example.com" },
        });
        expect(invalid.status()).toBe(200);
        const invalidBody = await invalid.json();
        expect(invalidBody.kind).toBe("response");
        expect(invalidBody.error?.code).toBe("invalid_request");
        expect(invalidBody.result).toBeNull();

        const unauth = await request.post(`${serverUrl}/`, {
            headers: { "Content-Type": "application/json" },
            data: {
                method: "getAuthInfo",
                params: [],
                device: {},
                auth: {},
                kind: "request",
                version: "4.0.0",
            },
        });
        expect(unauth.status()).toBe(200);
        const unauthBody = await unauth.json();
        expect(unauthBody.kind).toBe("response");
        expect(unauthBody.error?.code).toBe("invalid_session");
        expect(unauthBody.result).toBeNull();
    });
});
```

Do **not** assert a frozen `version` string unless verified against current server; prefer `kind` + `error.code`.

- [ ] **Step 2: Run server + full suite**

```bash
pnpm run test:e2e -- e2e/server.spec.ts
pnpm run test:e2e
```

Expected: all Playwright specs pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/server.spec.ts
git commit -m "test: add Playwright server HTTP smoke"
```

---

### Task 6: CI required e2e job + delete Cypress/v3 + docs

**Files:**
- Modify: `.github/workflows/ci.yml`
- Delete: `.github/workflows/e2e.yml`
- Delete: `cypress/` (entire tree)
- Delete: `cypress.config.ts`
- Delete: `cypress.env.json`
- Modify: `biome.json` (remove `!**/cypress/fixtures` if present)
- Modify: `README.md` (e2e section)
- Modify: `CONTRIBUTING.md` (e2e section)
- Modify: `package.json` / lockfile if any Cypress leftovers

- [ ] **Step 1: Add `e2e` job to `.github/workflows/ci.yml`**

Append after the `unit` job (same checkout/pnpm/node pattern):

```yaml
    e2e:
        name: e2e
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version-file: ".nvmrc"
                  cache: "pnpm"
            - name: Install dependencies
              run: pnpm install --frozen-lockfile
            - name: Install Playwright Chromium
              run: pnpm exec playwright install --with-deps chromium
            - name: Run E2E tests
              run: pnpm run test:e2e
            - name: Upload Playwright report
              if: failure()
              uses: actions/upload-artifact@v4
              with:
                  name: playwright-report
                  path: playwright-report/
                  retention-days: 7
```

- [ ] **Step 2: Delete Cypress workflow and tree**

```bash
rm -f .github/workflows/e2e.yml cypress.config.ts cypress.env.json
rm -rf cypress
```

- [ ] **Step 3: Clean `biome.json`**

Remove the ignore entry `"!**/cypress/fixtures"` from `files.includes` if present.

- [ ] **Step 4: Update README e2e section**

Replace Cypress wording with:

```markdown
### End-to-end tests

```bash
pnpm exec playwright install chromium   # once per machine
pnpm run test:e2e
```

Interactive UI mode:

```bash
pnpm run test:e2e:dev
```
```

Keep surrounding README structure; only fix the e2e subsection (and any remaining `npm run` e2e lines in that subsection to `pnpm`).

- [ ] **Step 5: Update CONTRIBUTING.md**

Ensure the test section mentions:

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

Remove Cypress-specific notes if any.

- [ ] **Step 6: Grep for leftovers**

```bash
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs/superpowers \
  -e 'cypress' -e 'start:v3' -e 'v3-client' -e 'cypress.config' . || true
```

Expected: no runtime/package references left outside historical docs under `docs/superpowers/` (plans/specs may still mention Cypress as past tense — leave historical plans alone unless they claim Cypress is current required tooling in CONTRIBUTING/README).

- [ ] **Step 7: Final local verification**

```bash
pnpm run lint
pnpm run test:e2e
```

Expected: lint clean enough for CI gate; full e2e green.

- [ ] **Step 8: Commit**

```bash
git add -A
git status   # confirm backlog.md is NOT staged
git commit -m "ci: require Playwright e2e and remove Cypress"
```

---

### Task 7: Open PR and verify CI

**Files:** none (git/GitHub only)

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin test/playwright-e2e
gh pr create --base main --title "test: replace Cypress with Playwright e2e" --body "$(cat <<'EOF'
## Summary
- Replace Cypress with Playwright for Padloc v4 PWA + server e2e
- Required `e2e` job in `ci.yml` (Chromium)
- Smoke, auth, items, server HTTP specs; maildev retained
- Remove Cypress, v3 fixtures, and label-based `e2e.yml`

## Spec
- `docs/superpowers/specs/2026-07-10-playwright-e2e-design.md`

## Test plan
- [x] `pnpm run test:e2e` locally (if browser available)
- [ ] CI: lint, build, unit, e2e green
- [ ] Confirm smoke would fail without `pl-app` mount
EOF
)"
```

- [ ] **Step 2: Wait for checks**

```bash
gh pr checks --watch
```

Expected: `lint`, `build`, `unit`, `e2e`, `PR Title` pass. Inspect CodeRabbit/Cubic; fix real issues.

- [ ] **Step 3: Post-merge note for branch protection**

After merge, ensure GitHub branch protection required checks include the new CI job name `e2e` from workflow `CI` (not the deleted standalone E2E workflow). Document in PR comment if the owner must click UI settings.

- [ ] **Step 4: Do not merge until user confirms** (unless user already authorized merge).

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Playwright root layout | Task 1 |
| smoke mount + login shell | Task 1 |
| maildev email codes | Task 2–3 |
| signup/login/lock/unlock | Task 3 |
| items create + search | Task 4 |
| server HTTP smoke | Task 5 |
| required `e2e` in `ci.yml` | Task 6 |
| delete Cypress + v3 + `e2e.yml` | Task 6 |
| docs README/CONTRIBUTING | Task 6 |
| Chromium only / no Admin / no v3 | All tasks |
| PR + CI verification | Task 7 |

No TBD placeholders. Helper names consistent: `resetClientState`, `clearEmails`, `getCodeFromEmail`, `deep`, `typeIn`, `signup`, `login`, `lock`, `unlock`, `e2eEnv`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-playwright-e2e.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans and checkpoints  

Which approach?
