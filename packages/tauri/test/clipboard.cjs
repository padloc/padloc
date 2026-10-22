const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, {
        module, exports: module.exports, process: { env: { PL_IOS: "true" } },
        require(name) {
            assert.ok(name in dependencies, `Unexpected dependency ${name}`);
            return dependencies[name];
        },
    });
    return module.exports;
}

(async () => {
    let text = "";
    let release;
    let failure;
    const calls = [];
    const { NativeClipboard } = load("clipboard.ts", {
        "@tauri-apps/plugin-clipboard-manager": {
            async writeSecret(value) {
                calls.push(value);
                if (value === "slow") await new Promise((resolve) => { release = resolve; });
                if (failure) throw failure;
                text = value;
            },
            async readText() { if (failure) throw failure; return text; },
        },
    });
    const clipboard = new NativeClipboard();
    const first = clipboard.set("slow");
    const clear = clipboard.set(" "); // Existing Padloc countdown clearing value.
    const latest = clipboard.set("new secret 🔑\nsecond line");
    await Promise.resolve();
    assert.deepEqual(calls, ["slow"], "clear cannot overtake an unfinished copy");
    release();
    await Promise.all([first, clear, latest]);
    assert.deepEqual(calls, ["slow", " ", "new secret 🔑\nsecond line"]);
    assert.equal(await clipboard.get(), "new secret 🔑\nsecond line");
    await clipboard.set(" ");
    assert.equal(await clipboard.get(), " ", "countdown clearing removes the secret");
    failure = new Error("Clipboard permission denied");
    await assert.rejects(clipboard.get(), /permission denied/);
    await assert.rejects(clipboard.set("failed"), /permission denied/);
    failure = null;
    await clipboard.set("recovered");
    assert.equal(await clipboard.get(), "recovered", "a rejection does not poison the queue");

    class WebPlatform {}
    const { TauriPlatform } = load("platform.ts", {
        "@padloc/core/src/platform": { StubBiometricKeyStore: class {} },
        "@padloc/app/src/lib/platform": { WebPlatform },
        "@padloc/core/src/auth": { AuthType: { PublicKey: "public_key" } },
        "@padloc/core/src/auth/public-key": { PublicKeyAuthClient: class {} },
        "./biometric": { IosBiometricKeyStore: class {} },
        "./qr": { NativeQRScanner: class {} },
        "./clipboard": { NativeClipboard },
    });
    const platform = new TauriPlatform();
    await platform.setClipboard("native adapter");
    assert.equal(await platform.getClipboard(), "native adapter");
    const capabilities = JSON.parse(fs.readFileSync(path.join(__dirname, "../src-tauri/capabilities/clipboard.json")));
    assert.deepEqual(capabilities.windows, ["main"]);
    assert.deepEqual(capabilities.permissions, ["clipboard-manager:allow-write-secret", "clipboard-manager:allow-read-text"]);
    console.log("Native clipboard: ordering, clearing, Unicode, errors, recovery and platform routing passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
