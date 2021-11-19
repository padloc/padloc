const sharp = require("sharp");
const fs = require("fs");
const { resolve, join } = require("path");

const rootDir = resolve(__dirname, "../..");
const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
const { name, appId, scheme, build: buildVersion } = require(join(assetsDir, "manifest.json"));
const buildDir = resolve(__dirname, "build");

async function main() {
    if (fs.existsSync(buildDir)) {
        fs.rmdirSync(buildDir, { force: true, recursive: true });
    }
    fs.mkdirSync(buildDir);

    const baseIcon = sharp(join(assetsDir, "app-icon.png"));
    const { width } = await baseIcon.metadata();
    const padding = Math.floor(width / 20);
    await baseIcon
        .extend({
            top: padding,
            right: padding,
            bottom: padding,
            left: padding,
            background: { r: 0, b: 0, g: 0, alpha: 0 },
        })
        .png()
        .toFile(join(buildDir, "icon.png"));

    fs.copyFileSync(resolve(__dirname, "entitlements.plist"), join(buildDir, "entitlements.plist"));

    const buildConfig = {
        appId,
        buildVersion,
        directories: {
            app: "app",
            buildResources: "build",
        },
        mac: {
            hardenedRuntime: true,
            darkModeSupport: true,
            gatekeeperAssess: false,
            entitlements: "entitlements.plist",
            entitlementsInherit: "entitlements.plist",
        },
        protocols: {
            name,
            schemes: [scheme],
        },
        afterSign: "scripts/notarize.js",
    };

    fs.writeFileSync(join(buildDir, "build.json"), JSON.stringify(buildConfig, null, 4), "utf-8");
}

main();
