import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { e2eEnv } from "./env";
import { clearEmails, getCodeFromEmail } from "./mail";
import { resetClientState } from "./reset";
import { deep } from "./shadow";

/**
 * Fill pl-input / pl-password-input like a user: type into the real control.
 * Parent forms bind `?disabled=${!input.value}` and re-render on @input —
 * so we fill the shadow input and ensure host.value + a composed input event.
 */
async function fillField(host: Locator, text: string): Promise<void> {
    await host.waitFor({ state: "visible", timeout: 20_000 });
    const field = host.locator("input, textarea").first();
    await field.waitFor({ state: "attached", timeout: 10_000 });
    // Wait until not disabled (e.g. email is only editable on route "start")
    await expect
        .poll(async () => field.evaluate((el: HTMLInputElement) => !el.disabled), {
            timeout: 20_000,
            message: "input stayed disabled — wrong route or parent state",
        })
        .toBe(true);
    await field.click();
    await field.fill(text);
    // Ensure Lit parent sees the change (BaseInput does not re-dispatch input)
    await host.evaluate((el: HTMLElement & { value: string }, t: string) => {
        el.value = t;
        el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }, text);
    await expect.poll(async () => host.evaluate((el: { value: string }) => el.value), { timeout: 10_000 }).toBe(text);
}

async function setCheckbox(locator: Locator, checked = true): Promise<void> {
    // Real user path: click the checkbox if state differs
    const isChecked = await locator.evaluate((el: HTMLInputElement) => el.checked);
    if (isChecked !== checked) {
        await locator.click({ force: true });
    }
    await locator.evaluate((el: HTMLInputElement, val: boolean) => {
        if (el.checked !== val) {
            el.checked = val;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }, checked);
}

/** Wait until pl-button is not disabled, then click (user path). */
async function clickButton(button: Locator, opts: { force?: boolean } = {}): Promise<void> {
    await button.waitFor({ state: "attached", timeout: 20_000 });
    await expect
        .poll(async () => button.evaluate((el: HTMLElement) => !el.hasAttribute("disabled")), {
            timeout: 20_000,
            message: "button stayed disabled — field value may not have reached parent",
        })
        .toBe(true);
    // Prefer the inner native button when present (real hit target)
    const inner = button.locator("button").first();
    const target = (await inner.count()) > 0 ? inner : button;
    try {
        await target.click({ timeout: 8_000, force: opts.force });
    } catch {
        // Overlays (headers/drawers) sometimes intercept — still dispatch a real click
        await target.click({ timeout: 5_000, force: true });
    }
}

async function clickDialogButton(page: Page, label: string | RegExp): Promise<void> {
    const alert = deep(page, "pl-app", "pl-alert-dialog");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await clickButton(alert.locator("pl-button").filter({ hasText: label }).first());
}

/**
 * Email → code prompt → authToken. Returns login vs signup route.
 */
/** Ensure email field is editable (route start). */
async function ensureStartEmailForm(page: Page, shell: Locator): Promise<void> {
    const emailInput = shell.locator("#emailInput input");
    await shell.locator("#emailInput").waitFor({ state: "attached", timeout: 30_000 });

    for (let attempt = 0; attempt < 6; attempt++) {
        const enabled = await emailInput.evaluate((el: HTMLInputElement) => !el.disabled).catch(() => false);
        if (enabled) {
            return;
        }

        // Real UI: leave signup/consent → start
        const changeEmail = shell.locator("pl-button").filter({ hasText: "Change Email" });
        if (await changeEmail.isVisible().catch(() => false)) {
            await clickButton(changeEmail, { force: true });
            continue;
        }

        // Public router: empty params required (otherwise authToken is preserved)
        await page.evaluate(() => {
            window.router?.go("start", {}, true, true);
        });
        await page.waitForTimeout(200);

        if (attempt >= 2) {
            await page.goto("/start", { waitUntil: "domcontentloaded" });
            await page.evaluate(() => {
                window.router?.go("start", {}, true, true);
            });
            await shell.locator("#emailInput").waitFor({ state: "attached", timeout: 15_000 });
        }
    }

    await expect
        .poll(async () => emailInput.evaluate((el: HTMLInputElement) => !el.disabled), {
            timeout: 10_000,
            message: "email input still disabled after returning to start",
        })
        .toBe(true);
}

async function submitEmailForCode(page: Page, email: string): Promise<"login" | "signup"> {
    const shell = deep(page, "pl-app", "pl-start", "pl-login-signup");
    await ensureStartEmailForm(page, shell);
    await fillField(shell.locator("#emailInput"), email);
    await clearEmails();
    await clickButton(shell.locator("#submitEmailButton"));

    const prompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    const code = await getCodeFromEmail({ timeout: 30_000 });
    await fillField(prompt.locator("pl-input").first(), code);
    await clickButton(prompt.locator("#confirmButton"));

    await expect(page).toHaveURL(/authToken=/, { timeout: 30_000 });

    await expect
        .poll(
            () => {
                const u = page.url();
                if (u.includes("/login")) {
                    return "login";
                }
                if (u.includes("signup")) {
                    return "signup";
                }
                return "";
            },
            { timeout: 15_000 }
        )
        .not.toBe("");

    return page.url().includes("/login") ? "login" : "signup";
}

export async function signup(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();

    const shell = deep(page, "pl-app", "pl-start", "pl-login-signup");
    const path = await submitEmailForCode(page, email);
    if (path !== "signup") {
        throw new Error(`Expected signup for new email, got login. url=${page.url()}`);
    }

    const consent = shell.locator("pl-drawer#consentDrawer");
    await expect(consent).toBeVisible({ timeout: 15_000 });
    await fillField(consent.locator("#nameInput"), e2eEnv.name);
    await setCheckbox(consent.locator("input#tosCheckbox"), true);
    await clickButton(consent.locator("pl-button").filter({ hasText: "Create Account" }));

    await expect(page).toHaveURL(/signup\/choose-password/, { timeout: 20_000 });

    // Real UI: Don't like it? → Choose Your Own
    const chooseOwn = shell.locator("pl-button").filter({ hasText: "Choose Your Own" });
    await expect(chooseOwn).toBeVisible({ timeout: 15_000 });
    await clickButton(chooseOwn);

    await clickDialogButton(page, "Choose My Own");

    const masterPrompt = deep(page, "pl-app", "pl-prompt-dialog");
    await expect(masterPrompt).toBeVisible({ timeout: 15_000 });
    await fillField(masterPrompt.locator("pl-input").first(), e2eEnv.password);
    await clickButton(masterPrompt.locator("#confirmButton"));

    await clickDialogButton(page, "Use Anyway");

    // Continue with the chosen password (stretch primary on choose-password step)
    await clickButton(shell.locator("pl-button.stretch").filter({ hasText: "Continue" }).first());

    await expect(page).toHaveURL(/signup\/confirm-password/, { timeout: 20_000 });

    await fillField(shell.locator("pl-password-input#repeatPasswordInput"), e2eEnv.password);
    await clickButton(shell.locator("#confirmPasswordButton"));

    await expect(page).toHaveURL(/\/signup\/success/, { timeout: 45_000 });
    await clickButton(shell.locator("pl-button").filter({ hasText: "Get Started" }));
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}

export async function login(page: Page, email: string): Promise<void> {
    await resetClientState(page);
    await clearEmails();

    const shell = deep(page, "pl-app", "pl-start", "pl-login-signup");
    const path = await submitEmailForCode(page, email);
    if (path !== "login") {
        throw new Error(
            `Expected login for existing account ${email}, got signup. Server may have lost the account. url=${page.url()}`
        );
    }

    const passwordInput = shell.locator("pl-password-input#loginPasswordInput");
    await expect(passwordInput).toBeVisible({ timeout: 20_000 });
    await fillField(passwordInput, e2eEnv.password);
    await clickButton(shell.locator("pl-button#loginButton"));

    // Trusted-device confirm (Yes/No) — optional; race with navigation to /items
    const alert = deep(page, "pl-app", "pl-alert-dialog");
    const items = page.waitForURL(/\/items/, { timeout: 45_000 });
    const trusted = alert
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(async () => {
            const yes = alert.locator("pl-button").filter({ hasText: "Yes" }).first();
            if ((await yes.count()) > 0) {
                await clickButton(yes);
            } else {
                // Any primary-ish first option
                await clickButton(alert.locator("pl-button").first());
            }
        })
        .catch(() => undefined);

    await Promise.race([items, trusted.then(() => items)]);
    await expect(page).toHaveURL(/\/items/, { timeout: 45_000 });
}

export async function lock(page: Page): Promise<void> {
    // Do not full-navigate: document reload drops in-memory keys → unlock screen.
    await expect(page).toHaveURL(/\/items/, { timeout: 15_000 });
    const list = deep(page, "pl-app", "pl-items", "pl-items-list");
    // Mobile / narrow: open drawer menu first
    const menuButton = list.locator("pl-button.menu-button").first();
    if (await menuButton.isVisible().catch(() => false)) {
        await clickButton(menuButton, { force: true });
    }
    // Menu footer Lock can sit under list header hit-testing
    await clickButton(deep(page, "pl-app", "pl-menu").locator("pl-button").filter({ hasText: "Lock" }), {
        force: true,
    });
    await expect(page).toHaveURL(/\/unlock/, { timeout: 15_000 });
}

export async function unlock(page: Page, email: string): Promise<void> {
    // Already on /unlock after lock(); avoid full reload
    const unlockView = deep(page, "pl-app", "pl-start", "pl-unlock");
    await expect(unlockView).toBeVisible({ timeout: 15_000 });
    await expect(unlockView.locator("pl-input[label='Logged In As']").locator("input")).toHaveValue(email, {
        timeout: 20_000,
    });
    await fillField(unlockView.locator("pl-password-input#passwordInput"), e2eEnv.password);
    await clickButton(unlockView.locator("pl-button#unlockButton"));
    await expect(page).toHaveURL(/\/items/, { timeout: 30_000 });
}
