import { strict as assert } from "assert";
import { SafariBiometricKeyStore } from "../src/safari-biometric";

function fixture() {
    const local: Record<string, string> = {};
    const keys = new Map<string, string>();
    const calls: any[] = [];
    let failStore = false;
    let failRead = false;
    const native = {
        runtime: { async sendNativeMessage(_app: string, message: any) {
            calls.push(message);
            if (message.operation === "status") return { ok: true, supported: true };
            if (message.operation === "store") { keys.set(message.id, message.key); return { ok: true }; }
            if (message.operation === "remove") { keys.delete(message.id); return { ok: true }; }
            return failRead ? { ok: false, error: "Canceled" } : { ok: true, key: keys.get(message.id) };
        } },
        storage: { local: {
            async get(key: string) { return { [key]: local[key] }; },
            async set(values: any) { if (failStore) throw new Error("Storage failed"); Object.assign(local, values); },
        } },
    };
    return { store: new SafariBiometricKeyStore(native as any), keys, calls,
        failStore() { failStore = true; }, failRead() { failRead = true; } };
}

describe("Safari biometric Keychain bridge", () => {
    it("creates independent enrollment handles and retires the old key after replacement", async () => {
        const a = fixture(), b = fixture();
        const key = new Uint8Array(32).fill(7);
        await a.store.storeKey("", key);
        await b.store.storeKey("", key);
        assert.notEqual(a.calls[0].id, b.calls[0].id);
        assert.match(a.calls[0].id, /^[a-f0-9]{64}$/);
        assert.deepEqual(await a.store.getKey(""), key);
        await a.store.storeKey("", new Uint8Array(32).fill(8));
        assert.equal(a.keys.size, 1);
        assert.equal((await a.store.getKey(""))[0], 8);
    });
    it("sends padded standard Base64 that Foundation can decode", async () => {
        const a = fixture();
        const key = new Uint8Array(32).fill(255);
        await a.store.storeKey("", key);
        assert.equal(a.calls[0].key, Buffer.from(key).toString("base64"));
        assert.match(a.calls[0].key, /^[A-Za-z0-9+/]+=$/);
        assert.deepEqual(await a.store.getKey(""), key);
    });
    it("removes an orphan if local handle persistence fails", async () => {
        const a = fixture(); a.failStore();
        await assert.rejects(a.store.storeKey("", new Uint8Array(32)), /Storage failed/);
        assert.equal(a.keys.size, 0);
    });
    it("fails closed on cancellation and missing enrollment", async () => {
        const a = fixture();
        await assert.rejects(a.store.getKey(""), /re-enroll/);
        await a.store.storeKey("", new Uint8Array(32));
        a.failRead();
        await assert.rejects(a.store.getKey(""), /Canceled/);
    });
});
