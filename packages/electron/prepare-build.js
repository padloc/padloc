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
        .resize(512 - padding * 2, 512 - padding * 2, { fit: "inside" }) // Some targets don't deal well with images > 512x512
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
        productName: name,
        artifactName: `${name.toLowerCase()}_\${version}_\${os}_electron_\${arch}.\${ext}`,
        directories: {
            app: "app",
            buildResources: "build",
        },
        mac: {
            artifactName: `${name.toLowerCase()}_\${version}_macos_electron_\${arch}.\${ext}`,
            hardenedRuntime: true,
            darkModeSupport: true,
            gatekeeperAssess: false,
            entitlements: "entitlements.plist",
            entitlementsInherit: "entitlements.plist",
            category: "Utility",
            target: [
                {
                    target: "default",
                    arch: ["x64", "arm64"],
                },
            ],
        },
        protocols: {
            name,
            schemes: [scheme],
        },
        linux: {
            target: ["AppImage", "snap", "deb", "dir"],
            category: "Utility",
        },
        snap: {
            confinement: "strict",
            plugs: ["desktop", "home", "browser-support", "network", "opengl", "x11", "wayland", "unity7"],
            publish: ["github"],
        },
        win: {
            artifactName: `${name.toLowerCase()}_\${version}_windows_electron_\${arch}.\${ext}`,
        },
        afterSign: "scripts/notarize.js",
    };

    fs.writeFileSync(join(buildDir, "build.json"), JSON.stringify(buildConfig, null, 4), "utf-8");

    // Write flatpak-specific config, which has a few more restrictions
    const flatpakConfig = {
        ...buildConfig,
        appId: appId.split(".").length > 2 ? appId : `${appId}.app`, // appId needs to have 2 periods and can't finish on one
        linux: {
            ...buildConfig.linux,
            target: "flatpak",
        },
    };

    fs.writeFileSync(join(buildDir, "build-flatpak.json"), JSON.stringify(flatpakConfig, null, 4), "utf-8");
}

main();
