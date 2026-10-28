const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    path = require("node:path"),
    vm = require("node:vm"),
    ts = require("typescript");
const calls = [],
    alerts = [];
let failure;
let completed = false;
const deps = {
    "@tauri-apps/api/core": {
        invoke: async (command, args) => {
            if (failure) throw failure;
            calls.push({ command, args });
            return { completed };
        },
    },
    "@padloc/core/src/encoding": { bytesToBase64: (bytes) => Buffer.from(bytes).toString("base64") },
    "@padloc/app/src/lib/dialog": { alert: async (msg) => alerts.push(msg) },
    "@padloc/locale/src/translate": { translate: (x) => x },
};
const moduleObj = { exports: {} };
vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/files.ts"), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
        module: moduleObj,
        exports: moduleObj.exports,
        TextEncoder,
        require: (n) => {
            if (n.startsWith("../plugins/")) return require("./load-plugin.cjs")(n, deps);
            assert.ok(n in deps, n);
            return deps[n];
        },
    }
);
(async () => {
    const { shareFile } = moduleObj.exports;
    const bytes = Uint8Array.from([0, 255, 10, 128, 42]);
    await shareFile("test.bin", bytes);
    assert.equal(calls[0].command, "plugin:file-sharing|share_file");
    assert.deepEqual(Buffer.from(calls[0].args.data, "base64"), Buffer.from(bytes));
    assert.equal(alerts.length, 0, "cancellation is not an error");
    await shareFile("empty.txt", new Uint8Array());
    assert.equal(calls[1].args.data, "");
    for (const name of ["../secret", "a/b", "a\\b", "..", "bad\0name", "bad\nname", "x".repeat(241)])
        await shareFile(name, bytes);
    assert.equal(calls.length, 2, "invalid names never reach native storage");
    await shareFile("too-large.bin", { byteLength: 65 * 1024 * 1024 });
    assert.equal(calls.length, 2, "oversized files never cross IPC");
    const before = alerts.length;
    failure = new Error("secret filename");
    await shareFile("private.txt", bytes);
    assert.equal(alerts.length, before + 1);
    assert.ok(!alerts.at(-1).includes("private"));
    failure = null;
    await shareFile("recovered.txt", bytes);
    assert.equal(calls.at(-1).args.name, "recovered.txt");
    completed = null;
    const priorAlerts = alerts.length;
    await shareFile("android.txt", bytes);
    assert.equal(alerts.length, priorAlerts, "unknown Android delivery is not an error");
    console.log(
        "File sharing adapter: binary/empty files, cancellation, filename validation, safe errors and recovery passed"
    );
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
