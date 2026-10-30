import { defineConfig } from "cypress";

export default defineConfig({
    includeShadowDom: true,
    video: false,
    chromeWebSecurity: false,
    screenshotOnRunFailure: false,
    waitForAnimations: true,
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            const { name, serverUrl, v3_url } = config.env;
            config.expose = { name, serverUrl, v3_url, ...config.expose };
            require("./cypress/plugins/index.ts")(on, config);
            return config;
        },
        baseUrl: "http://localhost:8080",
    },
});
