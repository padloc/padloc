const { existsSync, readFileSync, readdirSync, copyFileSync, writeFileSync } = require("fs");
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
        ...(process.argv.includes("--force") ? ["--force"] : []),
        "--project-location",
        resolve(__dirname, "../safari"),
        "--app-name",
        process.env.PL_SAFARI_APP_NAME || "Padloc Safari Extension",
        "--bundle-identifier",
        process.env.PL_SAFARI_BUNDLE_IDENTIFIER || "app.padloc.safari",
    ],
    { stdio: "inherit" }
);
if (result.error) {
    console.error(`Could not run Apple's Safari Web Extension converter: ${result.error.message}`);
}
if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
}

// Some converter versions derive the containing app ID from the app name,
// independently of --bundle-identifier. Keep both targets in the requested namespace.
const projectRoot = resolve(__dirname, "../safari", process.env.PL_SAFARI_APP_NAME || "Padloc Safari Extension");
const project = readdirSync(projectRoot).find((name) => name.endsWith(".xcodeproj"));
if (!project) {
    throw new Error("Safari converter did not generate an Xcode project.");
}
const projectFile = resolve(projectRoot, project, "project.pbxproj");
const parsed = spawnSync("plutil", ["-convert", "json", "-o", "-", projectFile], { encoding: "utf8" });
if (parsed.status !== 0) {
    throw new Error(parsed.stderr || "Could not read generated Xcode project.");
}
const converted = spawnSync("plutil", ["-convert", "xml1", projectFile], { stdio: "inherit" });
if (converted.status !== 0) throw new Error("Could not convert generated Xcode project.");
const { objects } = JSON.parse(parsed.stdout);
const bundleId = process.env.PL_SAFARI_BUNDLE_IDENTIFIER || "app.padloc.safari";
for (const target of Object.values(objects)) {
    const suffix =
        target.productType === "com.apple.product-type.application"
            ? ""
            : target.productType === "com.apple.product-type.app-extension"
            ? ".Extension"
            : null;
    if (suffix === null) continue;
    if (suffix === ".Extension") {
        copyFileSync(resolve(__dirname, "../native/safari/Biometric.entitlements"),
            resolve(projectRoot, "Biometric.entitlements"));
    }
    for (const configId of objects[target.buildConfigurationList].buildConfigurations) {
        const updated = spawnSync(
            "plutil",
            [
                "-replace",
                `objects.${configId}.buildSettings.PRODUCT_BUNDLE_IDENTIFIER`,
                "-string",
                bundleId + suffix,
                projectFile,
            ],
            { stdio: "inherit" }
        );
        if (updated.status !== 0) throw new Error("Could not set generated bundle identifier.");
        if (suffix === ".Extension") {
            const entitlements = spawnSync("plutil", ["-replace",
                `objects.${configId}.buildSettings.CODE_SIGN_ENTITLEMENTS`, "-string",
                "Biometric.entitlements", projectFile], { stdio: "inherit" });
            if (entitlements.status !== 0) throw new Error("Could not configure biometric Keychain entitlements.");
        }
        if (process.env.PL_APPLE_DEVELOPMENT_TEAM) {
            const signed = spawnSync("plutil", ["-replace",
                `objects.${configId}.buildSettings.DEVELOPMENT_TEAM`, "-string",
                process.env.PL_APPLE_DEVELOPMENT_TEAM, projectFile], { stdio: "inherit" });
            if (signed.status !== 0) throw new Error("Could not set development team.");
        }
    }
}

// Keep native code tracked outside the converter's generated output.
const appName = process.env.PL_SAFARI_APP_NAME || "Padloc Safari Extension";
copyFileSync(resolve(__dirname, "../native/safari/SafariWebExtensionHandler.swift"),
    resolve(projectRoot, `${appName} Extension/SafariWebExtensionHandler.swift`));
const controller = resolve(projectRoot, appName, "ViewController.swift");
writeFileSync(controller, readFileSync(controller, "utf8").replace(
    /let extensionBundleIdentifier = ".*"/, `let extensionBundleIdentifier = "${bundleId}.Extension"`));
