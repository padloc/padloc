import { defineConfig } from "cypress";

export default defineConfig({
    includeShadowDom: true,
    video: false,
    chromeWebSecurity: false,
    screenshotOnRunFailure: false,
    videoUploadOnPasses: false,
    waitForAnimations: true,
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            return require("./cypress/plugins/index.ts")(on, config);
        },
        baseUrl: "http://localhost:8080",
    },
});
