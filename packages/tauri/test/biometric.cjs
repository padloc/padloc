const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const codes = Object.fromEntries(
    ["NOT_FOUND", "NOT_SUPPORTED", "AUTHENTICATION_FAILED", "BAD_REQUEST", "INVALID_RESPONSE"].map((x) => [x, x])
);
class Err extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function load(file, dependencies, platform = "ios") {
    const module = { exports: {} };
    vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText,
        {
            module,
            exports: module.exports,
            require: (name) => {
                if (name.startsWith("../plugins/")) return require("./load-plugin.cjs")(name, dependencies);
                if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
                return dependencies[name];
            },
            process: { env: { PL_PLATFORM: platform } },
            Uint8Array,
        }
    );
    return module.exports;
}

(async () => {
    const calls = [];
    let stored;
    let rejection;
    const { NativeBiometricKeyStore } = load("biometric.ts", {
        "@tauri-apps/api/core": {
            invoke: async (command, args) => {
                calls.push({ command, args });
                if (rejection) throw rejection;
                if (command === "plugin:biometric-keystore|biometric_status") return { available: false };
                if (command === "plugin:biometric-keystore|biometric_store") {
                    stored = args.key;
                    return { ok: true };
                }
                if (command === "plugin:biometric-keystore|biometric_get") return { key: stored };
            },
        },
        "@padloc/core/src/encoding": {
            bytesToBase64: (bytes) => Buffer.from(bytes).toString("base64"),
            base64ToBytes: (text) => new Uint8Array(Buffer.from(text, "base64")),
        },
        "@padloc/core/src/error": { Err, ErrorCode: codes },
    });
    const store = new NativeBiometricKeyStore();
    assert.equal(await store.isSupported(), false, "no enrollment does not advertise biometric support");
    const key = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));
    await store.storeKey("", key);
    assert.deepEqual(await store.getKey(""), key, "native secret encoding preserves every byte");
    const count = calls.length;
    await assert.rejects(store.storeKey("", new Uint8Array(16)), (e) => e.code === codes.BAD_REQUEST);
    assert.equal(calls.length, count, "invalid key never reaches native storage");
    rejection = { code: "cancelled", message: "Cancelled" };
    await assert.rejects(store.getKey(""), (e) => e.code === codes.AUTHENTICATION_FAILED && e.message === "Cancelled");
    rejection = { code: "not_found", message: "Set up again" };
    await assert.rejects(
        store.getKey(""),
        (e) => e.code === codes.NOT_FOUND,
        "enrollment-invalidated key triggers existing re-setup UX"
    );
    rejection = null;
    stored = "AA==";
    await assert.rejects(store.getKey(""), (e) => e.code === codes.INVALID_RESPONSE);

    const AuthType = { Email: "email", Totp: "totp", PublicKey: "public-key", WebAuthnPlatform: "webauthn" };
    class StubBiometricKeyStore {
        async isSupported() {
            return false;
        }
    }
    class WebPlatform {
        get supportedAuthTypes() {
            return ["web"];
        }
        async supportsPlatformAuthenticator() {
            return "web-support";
        }
        async _prepareRegisterAuthenticator(res) {
            return ["web-register", res.data];
        }
        async _prepareCompleteAuthRequest(res) {
            return ["web-auth", res.data];
        }
    }
    class PublicKeyAuthClient {
        constructor(keyStore) {
            this.keyStore = keyStore;
        }
        async prepareRegistration(data) {
            return ["public-register", data];
        }
        async prepareAuthentication(data) {
            return ["public-auth", data];
        }
    }
    const dependencies = {
        "@padloc/core/src/platform": { StubBiometricKeyStore },
        "@padloc/app/src/lib/platform": { WebPlatform },
        "@padloc/core/src/auth": { AuthType },
        "@padloc/core/src/auth/public-key": { PublicKeyAuthClient },
        "./biometric": { NativeBiometricKeyStore },
        "./files": { shareFile: async () => {} },
        "./links": { launchExternalLink() {}, openExternalLink: async () => {} },
        "./qr": { NativeQRScanner: class {} },
        "./clipboard": { NativeClipboard: class {} },
    };
    const ios = new (load("platform.ts", dependencies).TauriPlatform)();
    assert.deepEqual(Array.from(ios.supportedAuthTypes), ["email", "totp", "public-key"]);
    assert.equal(ios.platformAuthType, AuthType.PublicKey);
    assert.deepEqual(Array.from(await ios._prepareRegisterAuthenticator({ type: AuthType.PublicKey, data: 1 })), [
        "public-register",
        1,
    ]);
    assert.deepEqual(Array.from(await ios._prepareCompleteAuthRequest({ type: AuthType.PublicKey, data: 2 })), [
        "public-auth",
        2,
    ]);
    assert.deepEqual(Array.from(await ios._prepareCompleteAuthRequest({ type: AuthType.Email, data: 3 })), [
        "web-auth",
        3,
    ]);
    const android = new (load("platform.ts", dependencies, "android").TauriPlatform)();
    assert.equal(android.platformAuthType, AuthType.PublicKey);
    assert.ok(android.biometricKeyStore instanceof NativeBiometricKeyStore);
    assert.deepEqual(Array.from(android.supportedAuthTypes), ["email", "totp", "public-key"]);
    assert.deepEqual(Array.from(await android._prepareCompleteAuthRequest({ type: AuthType.PublicKey, data: 9 })), ["public-auth", 9]);
    const desktop = new (load("platform.ts", dependencies, "darwin").TauriPlatform)();
    assert.deepEqual(Array.from(desktop.supportedAuthTypes), ["web"]);
    assert.equal(await desktop.supportsPlatformAuthenticator(), "web-support");
    assert.equal(desktop.platformAuthType, AuthType.WebAuthnPlatform);
    console.log("Biometric adapter: encoding, errors, native routing and desktop fallback passed");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
