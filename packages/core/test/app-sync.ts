import { assert } from "chai";
import { suite, test } from "mocha";
// Initialize the shared platform before App to avoid its storage import cycle.
import "../src/platform";
import { App } from "../src/app";

function deferred() {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

class SyncApp extends App {
    constructor() { super({ send: async () => { throw new Error("Unexpected network request"); } }); }
    fetchAuthInfo = async () => {};
    fetchAccount = async () => {};
    fetchOrgs = async () => {};
    autoHandleInvites = async () => {};
    syncVaults = async () => {};
    save = async () => {};
    setStats = async () => {};
    publish = () => {};
}

suite("Synchronization state", () => {
    test("offline failure clears syncing and preserves the error", async () => {
        const app = new SyncApp();
        const failure = new Error("offline");
        app.fetchAuthInfo = async () => { throw failure; };
        const error = await app.synchronize().then(() => null, error => error);
        assert.strictEqual(error, failure);
        assert.isFalse(app.state.syncing, "expired auto-lock can proceed after failed sync");
    });

    test("a failed sync cannot clear a concurrent synchronization", async () => {
        const app = new SyncApp();
        const first = deferred(), second = deferred();
        let calls = 0;
        app.fetchAuthInfo = () => ++calls === 1 ? first.promise : second.promise;
        const failed = app.synchronize().catch(error => error);
        const running = app.synchronize();
        first.reject(new Error("offline"));
        await failed;
        assert.isTrue(app.state.syncing);
        second.resolve();
        await running;
        assert.isFalse(app.state.syncing);
    });

    test("active and queued vault work keeps syncing true until it settles", async () => {
        const app = new SyncApp();
        const first = deferred(), second = deferred();
        const active = (app as any)._queueSync({ id: "synthetic" }, () => first.promise);
        const queued = (app as any)._queueSync({ id: "synthetic" }, () => second.promise);
        app.fetchAuthInfo = async () => { throw new Error("offline"); };
        await app.synchronize().catch(() => {});
        assert.isTrue(app.state.syncing);
        first.resolve();
        await active;
        assert.isTrue(app.state.syncing, "queued work still holds the lock barrier");
        second.resolve();
        await queued;
        assert.isFalse(app.state.syncing);
    });
});
