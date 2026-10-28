const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/platform.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load(target, native) {
    class WebPlatform {
        async getDeviceInfo() {
            // iPad WebViews may advertise a desktop Mac user agent.
            return {
                platform: "MacOS",
                osVersion: "10.15.7",
                model: "inherited model",
                manufacturer: "inherited manufacturer",
                browser: "Safari",
                locale: "en",
                appVersion: "4.3.0",
            };
        }
    }
    const dependencies = {
        "@padloc/core/src/platform": { StubBiometricKeyStore: class {} },
        "@padloc/app/src/lib/platform": { WebPlatform },
        "@padloc/core/src/auth": { AuthType: {} },
        "@padloc/core/src/auth/public-key": { PublicKeyAuthClient: class {} },
        "./biometric": { NativeBiometricKeyStore: class {} },
        "./clipboard": { NativeClipboard: class {} },
        "./qr": { NativeQRScanner: class {} },
        "./links": {},
        "./files": {},
        "@tauri-apps/plugin-os": native,
    };
    const module = { exports: {} };
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        process: { env: { PL_PLATFORM: target } },
        require(name) {
            assert.ok(name in dependencies, name);
            return dependencies[name];
        },
    });
    return module.exports;
}

(async () => {
    for (const [target, label, mobile] of [
        ["ios", "iOS", true],
        ["android", "Android", true],
        ["darwin", "macOS", false],
        ["windows", "Windows", false],
        ["linux", "Linux", false],
    ]) {
        const { TauriPlatform, isMobile } = load(target, {
            platform: () => (target === "darwin" ? "macos" : target),
            version: () => "27.1",
        });
        const info = await new TauriPlatform().getDeviceInfo();
        assert.equal(isMobile, mobile);
        assert.equal(info.platform, label);
        assert.equal(info.osVersion, "27.1", "native version replaces desktop-like or frozen UA version");
        assert.equal(info.runtime, "tauri");
        assert.equal(info.description, `${label} Device`);
        assert.equal(info.model, "inherited model", "preserve the default model implementation");
        assert.equal(info.manufacturer, "inherited manufacturer", "preserve the default manufacturer implementation");
        assert.equal(info.browser, "Safari", "preserve inherited WebView metadata");
    }
    const { TauriPlatform } = load("", { platform: () => "android", version: () => "16" });
    assert.equal(
        (await new TauriPlatform().getDeviceInfo()).platform,
        "Android",
        "native target works without a frontend build target"
    );
    const unavailable = {
        platform() {
            throw new Error("Unavailable");
        },
    };
    const fallback = await new (load("ios", unavailable).TauriPlatform)().getDeviceInfo();
    assert.equal(fallback.platform, "iOS");
    assert.equal(fallback.osVersion, "10.15.7", "retain inherited fallback if native information is unavailable");
    const browserFallback = await new (load("", unavailable).TauriPlatform)().getDeviceInfo();
    assert.equal(browserFallback.platform, "MacOS");
    console.log(
        "Device information: native OS/platform, target routing, desktop-like UA correction and fallback passed"
    );
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
