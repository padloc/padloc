const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness({ enabled = true, locked = false, syncing = false } = {}) {
    let now = 100000;
    let locks = 0;
    const listeners = new Map();
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
        constructor(value) {
            super(value === undefined ? now : value);
        }
    }
    const module = { exports: {} };
    const source = fs.readFileSync(path.join(__dirname, "../../app/src/mixins/auto-lock.ts"), "utf8");
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
            document: { addEventListener: (name, handler) => listeners.set(name, handler) },
            window: { setTimeout: () => 1 },
            clearTimeout() {},
        }
    );
    const Lock = module.exports.AutoLock(class {});
    const instance = new Lock();
    return {
        instance,
        app,
        routes,
        listeners,
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
    short.instance._pause();
    short.advance(1000);
    await short.instance._resume();
    assert.equal(short.locks(), 0, "short visit preserves unlocked state");

    const expired = harness({ syncing: true });
    expired.instance._pause();
    expired.advance(61000);
    const resumed = expired.instance._resume();
    assert.equal(expired.locks(), 0, "resume remains pending while sync holds decrypted objects");
    expired.finishSync();
    await resumed;
    assert.equal(expired.locks(), 1, "expired visit locks after sync settles instead of resetting timeout");
    assert.deepEqual(expired.routes, ["unlock"]);

    for (const settings of [{ enabled: false }, { locked: true }]) {
        const h = harness(settings);
        h.instance._pause();
        h.advance(61000);
        await h.instance._resume();
        assert.equal(h.locks(), 0, "disabled/already-locked state is respected");
    }

    const zero = harness();
    zero.app.settings.autoLockDelay = 0;
    zero.instance._pause();
    zero.advance(1);
    await zero.instance._resume();
    assert.equal(zero.locks(), 1, "zero delay locks after a background visit");

    const bridge = harness();
    bridge.advance(61000);
    await new Promise((complete, fail) =>
        bridge.listeners.get("padloc-platform-resume")({
            detail: { pausedAt: 100000, complete, fail },
        })
    );
    assert.equal(bridge.locks(), 1, "native timestamp works without a JS pause event");
    assert.deepEqual(bridge.routes, ["unlock"], "completion follows lock and navigation");
    console.log("Background security: 6 scenarios passed");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
