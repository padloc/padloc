import type { Page } from "@playwright/test";

declare global {
    interface Window {
        app?: { logout: () => Promise<void>; state?: { loggedIn?: boolean } };
        router?: {
            go: (path: string, params?: Record<string, string>, replace?: boolean, force?: boolean) => void;
        };
    }
}

/**
 * Clear client session and land on /start with a writable email field.
 * Uses public window.app / window.router (not private component methods).
 */
export async function resetClientState(page: Page): Promise<void> {
    await page.context().clearCookies();

    // Ensure we are on the app origin so window.app exists
    if (!page.url().includes("localhost") && !page.url().startsWith("http")) {
        await page.goto("/start", { waitUntil: "domcontentloaded" });
    } else if (!page.url().match(/^https?:\/\//)) {
        await page.goto("/start", { waitUntil: "domcontentloaded" });
    }

    try {
        await page.locator("pl-app").waitFor({ state: "attached", timeout: 5_000 });
    } catch {
        await page.goto("/start", { waitUntil: "domcontentloaded" });
        await page.locator("pl-app").waitFor({ state: "attached", timeout: 30_000 });
    }

    // Public app API: log out if a session is present
    await page.evaluate(async () => {
        try {
            if (window.app?.state?.loggedIn) {
                await window.app.logout();
            }
        } catch {
            // ignore
        }
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch {
            // ignore
        }
        if ("databases" in indexedDB) {
            const dbs = await indexedDB.databases();
            await Promise.all(
                dbs.map(
                    (db) =>
                        new Promise<void>((resolve) => {
                            if (!db.name) {
                                resolve();
                                return;
                            }
                            const req = indexedDB.deleteDatabase(db.name);
                            req.onsuccess = () => resolve();
                            req.onerror = () => resolve();
                            req.onblocked = () => resolve();
                        })
                )
            );
        }
    });

    // Full reload with clean URL (no authToken query)
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    await page.locator("pl-app").waitFor({ state: "attached", timeout: 30_000 });

    // Public router: force start with empty params (Router.go keeps old params if omitted)
    await page.evaluate(() => {
        window.router?.go("start", {}, true, true);
    });

    await page.locator("pl-app pl-start pl-login-signup #emailInput").waitFor({
        state: "attached",
        timeout: 30_000,
    });
}
