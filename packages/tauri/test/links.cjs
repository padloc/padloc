const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    vm = require("node:vm"),
    ts = require("typescript"),
    path = require("node:path");
const calls = [],
    alerts = [];
let click, failure;
class Anchor {
    constructor(href) {
        this.value = href;
    }
    getAttribute() {
        return this.value;
    }
    hasAttribute() {
        return false;
    }
}
const moduleObj = { exports: {} },
    window = {};
vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/links.ts"), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
        module: moduleObj,
        exports: moduleObj.exports,
        URL,
        HTMLAnchorElement: Anchor,
        window,
        document: {
            addEventListener: (name, fn) => {
                click = fn;
            },
        },
        require: (name) =>
            ({
                "@tauri-apps/plugin-opener": {
                    openUrl: async (url) => {
                        if (failure) throw failure;
                        calls.push(url);
                    },
                },
                "@padloc/app/src/lib/dialog": { alert: async (msg) => alerts.push(msg) },
                "@padloc/locale/src/translate": { translate: (x) => x },
            }[name]),
    }
);
const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
};
(async () => {
    const { openExternalLink, initializeExternalLinks } = moduleObj.exports;
    for (const url of [
        "https://example.com/path?q=test",
        "http://example.com/",
        "mailto:test@example.com?subject=Hello%20world",
        "tel:+123456",
    ])
        await openExternalLink(url);
    assert.equal(calls.length, 4);
    for (const url of [
        "javascript:alert(1)",
        "file:///tmp/test",
        "data:text/html,test",
        "custom:test",
        "/internal",
        "https://user:password@example.com/",
    ])
        await assert.rejects(openExternalLink(url));
    assert.equal(calls.length, 4, "blocked links never reach native code");
    initializeExternalLinks();
    assert.equal(window.open("https://example.com/legacy"), null);
    await flush();
    assert.equal(calls.at(-1), "https://example.com/legacy");
    function event(href) {
        const e = {
            button: 0,
            defaultPrevented: false,
            composedPath: () => [{}, new Anchor(href)],
            preventDefault() {
                this.defaultPrevented = true;
            },
            stopPropagation() {
                this.stopped = true;
            },
        };
        click(e);
        return e;
    }
    assert.equal(event("#fragment").defaultPrevented, false);
    assert.equal(event("/settings").defaultPrevented, false);
    assert.equal(event("https://example.com/terms").defaultPrevented, true);
    await flush();
    assert.equal(calls.at(-1), "https://example.com/terms");
    event("//example.com/secure");
    await flush();
    assert.equal(calls.at(-1), "https://example.com/secure");
    const before = calls.length;
    event("javascript:alert(1)");
    await flush();
    assert.equal(calls.length, before);
    assert.equal(alerts.length, 1);
    failure = new Error("native failure https://secret.example/");
    window.open("https://secret.example/");
    await flush();
    assert.equal(alerts.length, 2);
    assert.ok(!alerts[1].includes("secret"));
    const cap = JSON.parse(fs.readFileSync(path.join(__dirname, "../src-tauri/capabilities/links.json")));
    assert.deepEqual(cap.windows, ["main"]);
    assert.equal(cap.permissions.length, 1);
    assert.equal(cap.permissions[0].identifier, "opener:allow-open-url");
    assert.deepEqual(
        cap.permissions[0].allow.map((x) => x.url),
        ["http://*", "https://*", "mailto:*", "tel:*"]
    );
    const platformModule = { exports: {} };
    const routed = [];
    const dependencies = {
        "@padloc/core/src/platform": { StubBiometricKeyStore: class {} },
        "@padloc/app/src/lib/platform": { WebPlatform: class {} },
        "@padloc/core/src/auth": { AuthType: { PublicKey: "public", WebAuthnPlatform: "web" } },
        "@padloc/core/src/auth/public-key": { PublicKeyAuthClient: class {} },
        "./biometric": { NativeBiometricKeyStore: class {} },
        "./clipboard": { NativeClipboard: class {} },
        "./qr": { NativeQRScanner: class {} },
        "./files": { shareFile: async () => {} },
        "./links": { launchExternalLink: (url) => routed.push(url), openExternalLink: async (url) => routed.push(url) },
    };
    vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/platform.ts"), "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText,
        {
            module: platformModule,
            exports: platformModule.exports,
            process: { env: { PL_PLATFORM: "ios" } },
            require: (name) => dependencies[name],
        }
    );
    const platform = new platformModule.exports.TauriPlatform();
    platform.openExternalUrl("https://example.com/");
    await platform.composeEmail("test@example.com", "A & B", "line one\nline two?");
    assert.equal(routed[0], "https://example.com/");
    assert.equal(routed[1], "mailto:test@example.com?subject=A%20%26%20B&body=line%20one%0Aline%20two%3F");
    console.log(
        "External links: scheme/credential validation, native routing, legacy calls, shadow links, internal routing and safe errors passed"
    );
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
