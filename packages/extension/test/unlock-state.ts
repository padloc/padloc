// Initialize the platform before storage to avoid the existing core import cycle.
import "@padloc/core/src/platform";
import { MemoryStorage, Storable } from "@padloc/core/src/storage";
import { strict as assert } from "assert";
import { autoLockAlarm, isValidUnlockState, lockDeadline, UnlockStateStore, UnlockState } from "../src/unlock-state";

describe("MV3 unlock state", () => {
    const now = 1000000;
    const unlockState = new UnlockState({
        unlockId: "unlock-1",
        accountId: "account-1",
        masterKey: "test-key",
        lastActivity: now,
        expiresAt: now + 60000,
    });

    it("expires at the exact deadline even if the alarm has not fired", () => {
        assert.equal(isValidUnlockState(unlockState, "account-1", unlockState.expiresAt! - 1), true);
        assert.equal(isValidUnlockState(unlockState, "account-1", unlockState.expiresAt!), false);
        assert.equal(isValidUnlockState(unlockState, "account-1", unlockState.expiresAt! + 10000), false);
    });

    it("rejects keys from a different or logged-out account and malformed unlock states", () => {
        assert.equal(isValidUnlockState(unlockState, "account-2", now), false);
        assert.equal(isValidUnlockState(unlockState, undefined, now), false);
        const raw = unlockState.toRaw();
        delete raw.expiresAt;
        assert.equal(isValidUnlockState(new UnlockState().fromRaw(raw), "account-1", now), false);
        for (const changes of [{ unlockId: "" }, { masterKey: "" }, { expiresAt: NaN }, { expiresAt: Infinity }]) {
            assert.equal(isValidUnlockState(new UnlockState({ ...unlockState, ...changes }), "account-1", now), false);
        }
    });

    it("preserves disabled automatic locking and computes deadlines from activity", () => {
        assert.equal(lockDeadline({ autoLock: false, autoLockDelay: 5 }, now), null);
        assert.equal(
            isValidUnlockState(new UnlockState({ ...unlockState, expiresAt: null }), "account-1", now + 86400000),
            true
        );
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: 5 }, now), now + 300000);
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: 0 }, now), now);
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: NaN }, now), now);
    });

    it("restores from a fresh store instance and preserves the original lock deadline", async () => {
        const storage = new MemoryStorage();
        class OtherRecord extends Storable {
            id = "other";
        }
        await storage.save(new OtherRecord());
        let alarm: { name: string; when?: number } | undefined;
        const alarms = {
            clear: async () => {
                alarm = undefined;
                return true;
            },
            create: (name: string | undefined, info: { when?: number }) => {
                alarm = { name: name!, when: info.when };
            },
        };
        await new UnlockStateStore(storage, alarms).write(unlockState);
        assert.deepEqual(alarm, { name: autoLockAlarm, when: unlockState.expiresAt });

        // Simulate a worker losing every global and Chrome losing its alarm.
        alarm = undefined;
        const restarted = new UnlockStateStore(storage, alarms);
        const restored = (await restarted.read())!;
        await restarted.schedule(restored);
        assert.deepEqual(restored, unlockState);
        assert.equal(alarm!.when, unlockState.expiresAt);
        assert.equal(isValidUnlockState(restored, "account-1", unlockState.expiresAt!), false);

        await restarted.write(new UnlockState({ ...unlockState, expiresAt: null }));
        assert.equal(alarm, undefined);
        await restarted.clear();
        assert.equal(await restarted.read(), undefined);
        assert.equal((await storage.get(OtherRecord, "other")).id, "other");
    });

    it("propagates storage failures instead of treating them as a missing unlock state", async () => {
        const storage = new MemoryStorage();
        const failure = new Error("storage unavailable");
        storage.get = async () => {
            throw failure;
        };
        const store = new UnlockStateStore(storage, {
            clear: async () => false,
            create: () => {},
        });
        await assert.rejects(store.read(), (error: Error) => error === failure);
    });
});
