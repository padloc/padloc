const manifest = require("./src/manifest.json");

function createManifest({ browserTarget, serverUrl, firefoxId, webauthnRpId }) {
    if (!["chromium", "firefox", "safari"].includes(browserTarget)) {
        throw new Error("PL_EXTENSION_BROWSER must be chromium, firefox or safari");
    }
    const server = new URL(serverUrl);
    const result = {
        ...manifest,
        host_permissions: [
            `${server.protocol}//${server.hostname}/*`,
            ...(browserTarget === "chromium" && webauthnRpId ? [`https://${webauthnRpId}/*`] : []),
        ],
        content_security_policy: {
            extension_pages: `default-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'self'; connect-src 'self' ${server.origin} https://api.pwnedpasswords.com; frame-src 'self' blob:; img-src 'self' blob: data: *`,
        },
    };
    if (browserTarget !== "chromium") {
        delete result.minimum_chrome_version;
    }
    if (browserTarget === "firefox") {
        result.background = { scripts: ["background.js"], persistent: false };
        result.browser_specific_settings = {
            gecko: { strict_min_version: "128.0", ...(firefoxId ? { id: firefoxId } : {}) },
        };
    }
    if (browserTarget === "safari") {
        result.browser_specific_settings = { safari: { strict_min_version: "16.4" } };
        // This target is packaged only for macOS. Keep the Safari shortcut map
        // free of keys for platforms that this app does not support.
        result.commands = {
            ...manifest.commands,
            _execute_action: { suggested_key: { mac: manifest.commands._execute_action.suggested_key.mac } },
        };
    }
    return result;
}

module.exports = { createManifest };
