const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        appBundleId: "app.padloc",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.PL_MACOS_NOTARIZE_APPLE_ID,
        appleIdPassword: "@keychain:AC_PASSWORD",
    });
};
