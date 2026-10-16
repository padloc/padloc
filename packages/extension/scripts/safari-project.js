const { existsSync, readFileSync, readdirSync } = require("fs");
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
if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
}

// Some converter versions derive the containing app ID from the app name,
// independently of --bundle-identifier. Keep both targets in the requested namespace.
const projectRoot = resolve(__dirname, "../safari", process.env.PL_SAFARI_APP_NAME || "Padloc");
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
    }
}
