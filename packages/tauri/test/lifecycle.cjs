const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
};
function fixture(state, fail = false) {
    const calls = [],
        listeners = new Map();
    let release;
    const locked = new Promise((resolve) => {
        release = resolve;
    });
    const module = { exports: {} };
    let visibilityHandler;
    const document = {
        visibilityState: "visible",
        addEventListener: (name, handler, capture) => {
            assert.equal(name, "visibilitychange");
            assert.equal(capture, true);
            visibilityHandler = handler;
        },
        dispatchEvent: (event) => {
            if (event.type === "visibilitychange") {
                visibilityHandler(event);
                if (event.stopped) return;
            }
            calls.push(["event", event.type]);
        },
    };
    const window = {
        addEventListener: (name, handler) => listeners.set(name, handler),
        removeEventListener: (name) => listeners.delete(name),
    };
    const dependencies = {
        "@tauri-apps/api/core": {
            invoke: async (command, args) => {
                calls.push([command, args]);
                return command === "plugin:privacy-cover|background_state" ? state : undefined;
            },
        },
        "./background-lock": {
            reconcileBackgroundLock: async (pausedAt) => {
                calls.push(["lock", pausedAt]);
                await locked;
                if (fail) throw new Error("lock failed");
            },
        },
    };
    vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/lifecycle.ts"), "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText,
        {
            module,
            exports: module.exports,
            require: (name) =>
                name.startsWith("../plugins/")
                    ? require("./load-plugin.cjs")(name, dependencies, { window })
                    : dependencies[name],
            window,
            document,
            Event: class {
                constructor(type) {
                    this.type = type;
                }
                stopImmediatePropagation() {
                    this.stopped = true;
                }
            },
            requestAnimationFrame: (callback) => {
                calls.push(["paint"]);
                callback();
            },
            console: { error: () => calls.push(["failure"]) },
        }
    );
    return {
        calls,
        release,
        visible: () =>
            visibilityHandler({
                stopImmediatePropagation() {
                    calls.push(["deferred"]);
                },
            }),
        initialize: module.exports.initializeLifecycle,
    };
}
(async () => {
    const f = fixture({ generation: 7, pausedAt: 100, inactive: false });
    const ready = f.initialize();
    await flush();
    assert.deepEqual(
        f.calls.map((c) => c[0]),
        ["plugin:privacy-cover|background_state", "lock"]
    );
    f.release();
    await ready;
    assert.deepEqual(
        f.calls.map((c) => c[0]),
        [
            "plugin:privacy-cover|background_state",
            "lock",
            "event",
            "paint",
            "paint",
            "plugin:privacy-cover|resume_complete",
        ]
    );
    assert.equal(f.calls[2][1], "resume");
    assert.equal(f.calls[5][1].generation, 7);
    const failed = fixture({ generation: 8, pausedAt: 100, inactive: false }, true);
    const blocked = failed.initialize();
    failed.release();
    await blocked;
    assert.ok(
        !failed.calls.some((c) => c[0] === "plugin:privacy-cover|resume_complete"),
        "lock failure keeps native cover in place"
    );
    for (const state of [
        { inactive: true, pausedAt: 100 },
        { inactive: false, pausedAt: 0 },
    ]) {
        const skipped = fixture(state);
        await skipped.initialize();
        assert.deepEqual(
            skipped.calls.map((c) => c[0]),
            ["plugin:privacy-cover|background_state"]
        );
    }
    const foreground = fixture({ generation: 9, pausedAt: 100, inactive: false });
    const initializing = foreground.initialize();
    await flush();
    foreground.visible();
    await flush();
    assert.ok(!foreground.calls.some((c) => c[0] === "event"), "foreground sync is held until lock completes");
    foreground.release();
    await initializing;
    await flush();
    const uncover = foreground.calls.findIndex((c) => c[0] === "plugin:privacy-cover|resume_complete");
    const visibility = foreground.calls.findIndex((c) => c[0] === "event" && c[1] === "visibilitychange");
    assert.ok(visibility > uncover, "foreground sync runs only after lock and uncover");
    const failure = fixture({ generation: 10, pausedAt: 100, inactive: false }, true);
    const failureReady = failure.initialize();
    failure.visible();
    failure.release();
    await failureReady;
    await flush();
    assert.ok(!failure.calls.some((c) => c[0] === "event"), "failed reconciliation does not release foreground sync");
    console.log("Tauri lifecycle: lock-before-uncover, shared resume timer event and fail-closed handling passed");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
