const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness({ enabled = true, locked = false, syncing = false } = {}) {
    let now = 100000;
    let locks = 0;
    const routes = [];
    const subscribers = new Set();
    const app = {
        settings: { autoLock: enabled, autoLockDelay: 1 },
        state: { locked, syncing },
        async lock() {
            locks++;
            this.state.locked = true;
        },
        subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        },
    };
    class Clock extends Date {
        static now() { return now; }
        constructor(value) {
            super(value === undefined ? now : value);
        }
    }
    const module = { exports: {} };
    const source = fs.readFileSync(path.join(__dirname, "../src/background-lock.ts"), "utf8");
    vm.runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText,
        {
            module,
            exports: module.exports,
            Date: Clock,
            require: (name) =>
                name.includes("dialog")
                    ? { Dialog: { closeAll() {} } }
                    : { app, router: { go: (route) => routes.push(route) } },
        }
    );
    const resume = () => module.exports.reconcileBackgroundLock(100000);
    return {
        resume,
        app,
        routes,
        advance: (ms) => {
            now += ms;
        },
        locks: () => locks,
        finishSync() {
            app.state.syncing = false;
            for (const fn of subscribers) fn();
        },
    };
}

(async () => {
    const short = harness();
    short.advance(1000);
    await short.resume();
    assert.equal(short.locks(), 0, "short visit preserves unlocked state");

    const expired = harness({ syncing: true });
    expired.advance(61000);
    const resumed = expired.resume();
    assert.equal(expired.locks(), 0, "resume remains pending while sync holds decrypted objects");
    expired.finishSync();
    await resumed;
    assert.equal(expired.locks(), 1, "expired visit locks after sync settles instead of resetting timeout");
    assert.deepEqual(expired.routes, ["unlock"]);

    for (const settings of [{ enabled: false }, { locked: true }]) {
        const h = harness(settings);
        h.advance(61000);
        await h.resume();
        assert.equal(h.locks(), 0, "disabled/already-locked state is respected");
    }

    const zero = harness();
    zero.app.settings.autoLockDelay = 0;
    zero.advance(1);
    await zero.resume();
    assert.equal(zero.locks(), 1, "zero delay locks after a background visit");

    const bridge = harness();
    bridge.advance(61000);
    await bridge.resume();
    assert.equal(bridge.locks(), 1, "native timestamp works without a JS pause event");
    assert.deepEqual(bridge.routes, ["unlock"], "completion follows lock and navigation");
    console.log("Background security: 6 scenarios passed");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
