const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    vm = require("node:vm"),
    ts = require("typescript"),
    path = require("node:path");
const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
};
let pending = [],
    alerts = [],
    stops = 0;
class Dialog {
    static styles = [];
    show() {
        this.open = true;
        return Promise.resolve();
    }
    done(value) {
        this.open = false;
        this.value = value;
    }
}
const deps = {
    "@padloc/locale/src/translate": { translate: (x) => x },
    "@padloc/core/src/platform": {
        scanQR: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
        stopScanQR: async () => {
            stops++;
        },
    },
    "../styles": { mixins: { fullbleed: () => "" } },
    "../lib/dialog": { alert: async (msg) => alerts.push(msg) },
    "./dialog": { Dialog },
    "./icon": {},
    "lit/decorators.js": { customElement: () => (x) => x },
    lit: { css: () => "", html: () => "" },
};
const moduleObj = { exports: {} };
vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../app/src/elements/qr-dialog.ts"), "utf8"), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            experimentalDecorators: true,
        },
    }).outputText,
    {
        module: moduleObj,
        exports: moduleObj.exports,
        require: (n) => {
            assert.ok(n in deps, n);
            return deps[n];
        },
    }
);
(async () => {
    const dialog = new moduleObj.exports.QRDialog();
    await dialog.show();
    dialog.done();
    pending[0].reject(new Error("cancelled"));
    await flush();
    assert.equal(alerts.length, 0);
    await dialog.show();
    const old = pending[1];
    dialog.done();
    await dialog.show();
    old.resolve("stale");
    await flush();
    assert.equal(dialog.open, true);
    pending[2].resolve("valid");
    await flush();
    assert.equal(dialog.value, "valid");
    assert.equal(dialog.open, false);
    await dialog.show();
    pending[3].reject(new Error("No camera available"));
    await flush();
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /No camera/);
    assert.equal(dialog.open, false);
    assert.equal(stops, 4);
    console.log("QR dialog: silent cancellation, stale-result isolation, success and error closure passed");
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
