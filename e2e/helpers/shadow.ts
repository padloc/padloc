import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

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

/** Fill a pl-input / pl-textarea host via the real control (user path). */
export async function typeIn(host: Locator, text: string): Promise<void> {
    await host.waitFor({ state: "visible", timeout: 15_000 });
    const field = host.locator("input, textarea").first();
    await field.click();
    await field.fill(text);
    await host.evaluate((el: HTMLElement & { value: string }, t: string) => {
        el.value = t;
        el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }, text);
    await expect.poll(async () => host.evaluate((el: { value: string }) => el.value), { timeout: 10_000 }).toBe(text);
}
