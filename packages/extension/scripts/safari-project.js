const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");

if (process.platform !== "darwin") {
    console.error("Creating the Safari app requires macOS and the full Xcode installation.");
    process.exit(1);
}

const resources = resolve(__dirname, "../dist-safari");
const manifestPath = resolve(resources, "manifest.json");
if (!existsSync(manifestPath) || !JSON.parse(readFileSync(manifestPath, "utf8")).browser_specific_settings?.safari) {
    console.error("Build the Safari extension first with npm run build:safari.");
    process.exit(1);
}

const result = spawnSync(
    "xcrun",
    [
        "safari-web-extension-converter",
        resources,
        "--macos-only",
        "--copy-resources",
        "--no-open",
        "--no-prompt",
        "--project-location",
        resolve(__dirname, "../safari"),
        "--app-name",
        process.env.PL_SAFARI_APP_NAME || "Padloc",
        "--bundle-identifier",
        process.env.PL_SAFARI_BUNDLE_IDENTIFIER || "app.padloc.safari",
    ],
    { stdio: "inherit" }
);
if (result.error) {
    console.error(`Could not run Apple's Safari Web Extension converter: ${result.error.message}`);
}
process.exit(result.status === null ? 1 : result.status);
