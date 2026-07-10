import { expect, test } from "@playwright/test";
import { login, signup } from "./helpers/auth";
import { deep, typeIn } from "./helpers/shadow";

const testItem = {
    name: "Google",
    username: "example@google.com",
    password: "somethingsecret",
    url: "https://google.com",
};

/**
 * Single continuous flow: signup → create item → search hit/miss.
 * Avoids re-auth flakiness between separate tests.
 */
test.describe("items flows", () => {
    test("create item and search", async ({ page }) => {
        const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

        await signup(page, email);

        const list = deep(page, "pl-app", "pl-items", "pl-items-list");
        await expect(list).toBeVisible({ timeout: 15_000 });
        await list.locator('pl-button:has(pl-icon[icon="add"])').first().click({ force: true });

        const createDialog = deep(page, "pl-app", "pl-create-item-dialog");
        const createBtn = createDialog.locator("footer pl-button.primary");
        await expect(createBtn).toBeVisible({ timeout: 15_000 });
        // Create stays disabled until vault is selected (main vault may load async)
        await expect
            .poll(async () => createBtn.evaluate((el: HTMLElement) => !el.hasAttribute("disabled")), {
                timeout: 20_000,
                message: "Create button stayed disabled — vault not ready",
            })
            .toBe(true);
        await createBtn.locator("button").first().click({ force: true });

        await expect(page).toHaveURL(/\/items\//, { timeout: 20_000 });
        await expect(page).toHaveURL(/\/new/, { timeout: 20_000 });

        const itemView = deep(page, "pl-app", "pl-items", "pl-item-view");
        await expect(itemView.locator("pl-input#nameInput")).toBeVisible({ timeout: 15_000 });
        await typeIn(itemView.locator("pl-input#nameInput"), testItem.name);
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(0)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.username
        );
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(1)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.password
        );
        await typeIn(
            itemView
                .locator("pl-scroller pl-list pl-field")
                .nth(2)
                .locator("pl-input.value-input, pl-textarea.value-input"),
            testItem.url
        );
        await itemView.locator("pl-button.primary").click({ force: true });

        await expect(page).toHaveURL(/\/items\//);
        await expect(page).not.toHaveURL(/\/new/);

        // Search without full re-login (same session)
        await list.locator('pl-button:has(pl-icon[icon="search"])').first().click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), "secret");

        const rows = list.locator("main pl-virtual-list pl-scroller div.content > div");
        await expect(rows).toHaveCount(1);
        await expect(list.locator("pl-vault-item-list-item div.semibold").first()).toContainText(testItem.name);

        await list.locator("pl-input#filterInput pl-button.slim").click({ force: true });
        await list.locator('pl-button:has(pl-icon[icon="search"])').first().click({ force: true });
        await typeIn(list.locator("pl-input#filterInput"), "apple");
        await expect(list.locator("main > div.centering")).toContainText("did not match any items");

        // Also exercise login path once against this account
        await login(page, email);
        await expect(page).toHaveURL(/\/items/);
    });
});
