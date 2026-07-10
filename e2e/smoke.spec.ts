import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
    test("mounts pl-app and shows login shell", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("pl-app")).toBeAttached({ timeout: 30_000 });
        const emailInput = page.locator("pl-app").locator("pl-login-signup").locator("#emailInput");
        await expect(emailInput).toBeVisible({ timeout: 30_000 });
    });
});
