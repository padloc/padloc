const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const assetsDir = path.resolve(__dirname, process.env.PL_ASSETS_DIR || "../../assets");
const { name, appId, scheme, build: buildVersion } = require(path.join(assetsDir, "manifest.json"));
const buildDir = path.resolve(__dirname, "build");

async function main() {
    fs.rmdirSync(buildDir, { force: true, recursive: true });
    fs.mkdirSync(buildDir);

    const baseIcon = sharp(path.join(assetsDir, "app-icon.png"));
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
        .toFile(path.join(buildDir, "icon.png"));

    fs.copyFileSync(path.resolve(__dirname, "entitlements.plist"), path.join(buildDir, "entitlements.plist"));

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

    fs.writeFileSync(path.join(buildDir, "build.json"), JSON.stringify(buildConfig, null, 4), "utf-8");
}

main();
