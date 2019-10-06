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
        appleId: "martin@maklesoft.com",
        appleIdPassword: "@keychain:AC_PASSWORD"
    });
};
