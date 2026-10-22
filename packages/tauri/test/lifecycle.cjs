const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture(state, fail = false) {
    const calls = [], listeners = new Map();
    let release;
    const locked = new Promise(resolve => { release = resolve; });
    const module = { exports: {} };
    const dependencies = {
        '@tauri-apps/api/core': { invoke: async (command, args) => {
            calls.push([command, args]);
            return command === 'background_state' ? state : undefined;
        } },
        './background-lock': { reconcileBackgroundLock: async pausedAt => {
            calls.push(['lock', pausedAt]);
            await locked;
            if (fail) throw new Error('lock failed');
        } },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lifecycle.ts'), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, {
        module, exports: module.exports, require: name => dependencies[name],
        window: { addEventListener: (name, handler) => listeners.set(name, handler) },
        document: { dispatchEvent: event => calls.push(['event', event.type]) },
        Event: class { constructor(type) { this.type = type; } },
        requestAnimationFrame: callback => { calls.push(['paint']); callback(); },
        console: { error: () => calls.push(['failure']) },
    });
    return { calls, release, initialize: module.exports.initializeLifecycle };
}
(async () => {
    const f = fixture({ generation: 7, pausedAt: 100, inactive: false });
    const ready = f.initialize();
    await flush();
    assert.deepEqual(f.calls.map(c => c[0]), ['background_state', 'lock']);
    f.release(); await ready;
    assert.deepEqual(f.calls.map(c => c[0]), ['background_state', 'lock', 'event', 'paint', 'paint', 'resume_complete']);
    assert.equal(f.calls[2][1], 'resume');
    assert.equal(f.calls[5][1].generation, 7);
    const failed = fixture({ generation: 8, pausedAt: 100, inactive: false }, true);
    const blocked = failed.initialize(); failed.release(); await blocked;
    assert.ok(!failed.calls.some(c => c[0] === 'resume_complete'), 'lock failure keeps native cover in place');
    for (const state of [{ inactive: true, pausedAt: 100 }, { inactive: false, pausedAt: 0 }]) {
        const skipped = fixture(state); await skipped.initialize();
        assert.deepEqual(skipped.calls.map(c => c[0]), ['background_state']);
    }
    console.log('Tauri lifecycle: lock-before-uncover, shared resume timer event and fail-closed handling passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
