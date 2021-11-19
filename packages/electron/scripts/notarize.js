const { notarize } = require("electron-notarize");
const { resolve, join } = require("path");

exports.default = async function notarizing(context) {
    const rootDir = resolve(__dirname, "../../..");
    const assetsDir = resolve(rootDir, process.env.PL_ASSETS_DIR || "assets");
    const { appId } = require(join(assetsDir, "manifest.json"));
    const appleId = process.env.PL_NOTARIZE_APPLE_ID;
    const appleIdPassword = process.env.PL_NOTARIZE_APPLE_ID_PASSWORD;

    if (!appleId) {
        throw new Error("Notarization Failed - No Apple ID provided");
    }

    if (!appleIdPassword) {
        throw new Error("Notarization Failed - No Apple ID password provided");
    }

    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: appId,
        appPath: `${appOutDir}/${appName}.app`,
        appleId,
        appleIdPassword,
    });
};
