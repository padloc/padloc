import { test } from "@playwright/test";
import { lock, login, signup, unlock } from "./helpers/auth";

/**
 * One continuous flow per test avoids serial cross-test flakiness
 * (retries re-running signup mid-suite, shared email races).
 */
test.describe("auth flows", () => {
    test("signup then login then lock/unlock", async ({ page }) => {
        const email = `${Math.floor(Math.random() * 1e8)}@example.com`;

        await signup(page, email);
        await login(page, email);
        await lock(page);
        await unlock(page, email);
    });
});
