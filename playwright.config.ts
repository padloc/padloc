import { defineConfig, devices } from "@playwright/test";
import { e2eEnv } from "./e2e/helpers/env";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    // Fail the run if anything needed a retry — no silent flaky green.
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
    timeout: 180_000,
    expect: { timeout: 20_000 },
    use: {
        baseURL: e2eEnv.baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
        actionTimeout: 20_000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
