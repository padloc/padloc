const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const flush = async () => {
    for (let i = 0; i < 16; i++) await Promise.resolve();
};
function fixture() {
    let now = 0,
        nextId = 0,
        contents = "",
        rejectNext = false,
        release;
    const tasks = new Map(),
        alerts = [],
        writes = [];
    const schedule = (fn, delay, interval = false) => {
        const id = ++nextId;
        tasks.set(id, { fn, at: now + delay, delay, interval });
        return id;
    };
    class LitElement {
        classList = new Set();
        constructor() {
            this.classList.remove = this.classList.delete.bind(this.classList);
        }
    }
    const dependencies = {
        lit: { LitElement, css: () => "", html: () => "" },
        "lit/directives/style-map.js": { styleMap: () => "" },
        "lit/decorators.js": { customElement: () => (value) => value, property: () => () => {}, state: () => () => {} },
        "@padloc/locale/src/translate": { $l: (value) => value },
        "../styles": { shared: "" },
        "./icon": {},
        "./button": {},
        "../lib/dialog": {
            alert: async (value) => {
                alerts.push(value);
            },
        },
        "@padloc/core/src/platform": {
            async setClipboard(value) {
                writes.push(value);
                if (value === "slow")
                    await new Promise((resolve) => {
                        release = resolve;
                    });
                if (rejectNext) {
                    rejectNext = false;
                    throw new Error("native failure");
                }
                contents = value;
            },
        },
    };
    const module = { exports: {} };
    const timers = {
        setTimeout: (fn, delay) => schedule(fn, delay),
        setInterval: (fn, delay) => schedule(fn, delay, true),
    };
    vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../app/src/elements/clipboard.ts"), "utf8"), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2020,
                experimentalDecorators: true,
            },
        }).outputText,
        {
            module,
            exports: module.exports,
            require: (name) => {
                assert.ok(name in dependencies, `Unexpected dependency ${name}`);
                return dependencies[name];
            },
            window: timers,
            Date: { now: () => now },
            clearInterval: (id) => tasks.delete(id),
            clearTimeout: (id) => tasks.delete(id),
        }
    );
    const ui = new module.exports.Clipboard();
    return {
        ui,
        writes,
        alerts,
        get contents() {
            return contents;
        },
        fail() {
            rejectNext = true;
        },
        release() {
            release();
        },
        async advance(ms) {
            const end = now + ms;
            while (true) {
                const due = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
                if (!due) break;
                const [id, task] = due;
                now = task.at;
                if (task.interval) task.at += task.delay;
                else tasks.delete(id);
                task.fn();
                await flush();
            }
            now = end;
            await flush();
        },
        // Model a suspended webview: time passes but JS callbacks do not run.
        suspend(ms) {
            now += ms;
        },
        async resumeTick() {
            for (const task of [...tasks.values()]) if (task.interval) task.fn();
            await flush();
        },
    };
}

(async () => {
    {
        const f = fixture();
        const done = f.ui.set("secret", "Password", 60);
        assert.deepEqual(f.writes, ["secret"], "first write retains the caller's user-gesture context");
        await flush();
        await f.advance(10);
        assert.equal(f.contents, "secret");
        assert.ok(f.ui.classList.has("showing"));
        await f.advance(59989);
        assert.equal(f.contents, "secret", "secret remains before expiry");
        await f.advance(1);
        await done;
        assert.equal(f.contents, " ");
        assert.ok(!f.ui.classList.has("showing"));
    }
    {
        const f = fixture();
        let replaced = false;
        const first = f.ui.set("first", "First", 60).then(() => {
            replaced = true;
        });
        await flush();
        await f.advance(30000);
        const second = f.ui.set("second", "Second", 60);
        await flush();
        await first;
        assert.ok(replaced, "replaced copy promise settles");
        await f.advance(30000);
        assert.equal(f.contents, "second", "old countdown cannot clear a newer copy");
        await f.advance(30000);
        await second;
        assert.equal(f.contents, " ");
    }
    {
        const f = fixture();
        const copy = f.ui.set("slow");
        await flush();
        const clear = f.ui.clear();
        await flush();
        assert.deepEqual(f.writes, ["slow"]);
        f.release();
        await flush();
        await copy;
        await clear;
        await f.advance(20);
        assert.equal(f.contents, " ");
        assert.ok(!f.ui.classList.has("showing"), "late copy cannot resurrect a cleared banner");
    }
    {
        const f = fixture();
        const old = f.ui.set("slow", "Old");
        await flush();
        const clear = f.ui.clear();
        const latest = f.ui.set("latest", "Latest", 2);
        f.release();
        await flush();
        await old;
        await clear;
        await f.advance(10);
        assert.equal(f.contents, "latest");
        assert.equal(f.ui.label, "Latest");
        assert.ok(f.ui.classList.has("showing"), "stale clear cannot hide the latest successful copy");
        await f.advance(1990);
        await latest;
        assert.equal(f.contents, " ");
    }
    {
        const f = fixture();
        f.fail();
        await f.ui.set("failed");
        await f.advance(20);
        assert.ok(!f.ui.classList.has("showing"), "failed copy never advertises success");
        assert.match(f.alerts[0], /Unable to copy/);
        const done = f.ui.set("secret");
        await flush();
        await f.advance(10);
        f.fail();
        await f.ui.clear();
        assert.equal(f.contents, "secret");
        assert.ok(f.ui.classList.has("showing"), "failed clear remains available for retry");
        assert.match(f.alerts[1], /Unable to clear/);
        await f.ui.clear();
        await done;
        assert.equal(f.contents, " ");
    }
    {
        const f = fixture();
        const done = f.ui.set("first", "First", 60);
        await flush();
        await f.advance(30000);
        f.fail();
        await f.ui.set("failed replacement");
        await f.advance(30000);
        await done;
        assert.equal(f.contents, " ", "failed replacement preserves earlier expiry");
    }
    {
        const f = fixture();
        const done = f.ui.set("secret", "Password", 1);
        await flush();
        f.fail();
        await f.advance(1000);
        assert.equal(f.contents, "secret", "failed timed clear must not claim the secret was removed");
        assert.ok(f.ui.classList.has("showing"));
        assert.equal(f.alerts.length, 1);
        await f.advance(10000);
        assert.equal(f.alerts.length, 1, "failed timed clear does not create an alert loop");
        await f.ui.clear();
        await done;
        assert.equal(f.contents, " ");
    }
    {
        const f = fixture();
        const done = f.ui.set("secret");
        await flush();
        await f.advance(10);
        f.suspend(120000);
        assert.equal(f.contents, "secret", "JS countdown cannot promise expiry while suspended");
        await f.resumeTick();
        await done;
        assert.equal(f.contents, " ", "first resumed tick reconciles elapsed wall time");
    }
    console.log(
        "Clipboard UI: expiry boundaries, replacement, pending writes, failure/retry and suspended-time reconciliation passed"
    );
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
