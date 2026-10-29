const assert = require("assert").strict;
const { createManifest } = require("../browser-manifest");

const build = (browserTarget) =>
    createManifest({ browserTarget, serverUrl: "https://vault.example:8443/api", firefoxId: "test@example.com" });
const safari = build("safari");
assert.equal(safari.manifest_version, 3);
assert.deepEqual(safari.background, { service_worker: "background.js" });
assert.equal(safari.minimum_chrome_version, undefined);
assert.deepEqual(safari.browser_specific_settings, { safari: { strict_min_version: "16.4" } });
assert.deepEqual(safari.commands._execute_action.suggested_key, { mac: "Command+Shift+P" });
assert.equal(safari.action.default_popup, "popup.html");
assert.ok(safari.permissions.includes("scripting"));
assert.deepEqual(safari.host_permissions, ["https://vault.example/*"]);
assert.ok(safari.content_security_policy.extension_pages.includes("https://vault.example:8443"));
assert.ok(!safari.content_security_policy.extension_pages.includes("unsafe-eval"));

// Creating a Safari manifest must not mutate the shared Chromium manifest.
const chromium = build("chromium");
assert.deepEqual(chromium.background, { service_worker: "background.js" });
assert.equal(chromium.minimum_chrome_version, "127");
assert.ok(chromium.commands._execute_action.suggested_key.windows);
assert.equal(chromium.browser_specific_settings, undefined);
const firefox = build("firefox");
assert.deepEqual(firefox.background, { scripts: ["background.js"], persistent: false });
assert.equal(firefox.browser_specific_settings.gecko.id, "test@example.com");
assert.equal(firefox.browser_specific_settings.safari, undefined);
assert.throws(() => build("unknown"), /PL_EXTENSION_BROWSER/);
const biometric = createManifest({
    browserTarget: "chromium",
    serverUrl: "https://api.example.com",
    webauthnRpId: "vault.example.com",
});
assert.deepEqual(biometric.host_permissions, ["https://api.example.com/*", "https://vault.example.com/*"]);
const firefoxBiometric = createManifest({
    browserTarget: "firefox",
    serverUrl: "https://api.example.com",
    firefoxId: "test@example.com",
    webauthnRpId: "vault.example.com",
});
assert.deepEqual(firefoxBiometric.host_permissions, ["https://api.example.com/*", "https://vault.example.com/*"]);
// Older Firefox remains installable, with biometrics gated at runtime.
assert.equal(firefoxBiometric.browser_specific_settings.gecko.strict_min_version, "128.0");
const { firefoxWebAuthnOrigin } = require("../scripts/firefox-webauthn-origin");
assert.equal(
    firefoxWebAuthnOrigin("abc"),
    "moz-extension://lkhibglpipabmpokebebeanofnkocccdlaadgbkdjgbhhkjmlebappgbpcaabfkn"
);
assert.throws(() => firefoxWebAuthnOrigin(""), /add-on ID/);
console.log("Chromium, Firefox and Safari manifest checks passed.");
