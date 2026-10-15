import { strict as assert } from "assert";
import { autoLockAlarm, isValidSession, lockDeadline, sessionKey, SessionStore, UnlockSession } from "../src/session";

describe("MV3 unlock sessions", () => {
    const now = 1000000;
    const session: UnlockSession = {
        id: "unlock-1",
        accountId: "account-1",
        masterKey: "test-key",
        lastActivity: now,
        expiresAt: now + 60000,
    };

    it("expires at the exact deadline even if the alarm has not fired", () => {
        assert.equal(isValidSession(session, "account-1", session.expiresAt! - 1), true);
        assert.equal(isValidSession(session, "account-1", session.expiresAt!), false);
        assert.equal(isValidSession(session, "account-1", session.expiresAt! + 10000), false);
    });

    it("rejects keys from a different or logged-out account and malformed sessions", () => {
        assert.equal(isValidSession(session, "account-2", now), false);
        assert.equal(isValidSession(session, undefined, now), false);
        for (const changes of [{ id: "" }, { masterKey: "" }, { expiresAt: NaN }, { expiresAt: Infinity }]) {
            assert.equal(isValidSession({ ...session, ...changes }, "account-1", now), false);
        }
    });

    it("preserves disabled automatic locking and computes deadlines from activity", () => {
        assert.equal(lockDeadline({ autoLock: false, autoLockDelay: 5 }, now), null);
        assert.equal(isValidSession({ ...session, expiresAt: null }, "account-1", now + 86400000), true);
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: 5 }, now), now + 300000);
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: 0 }, now), now);
        assert.equal(lockDeadline({ autoLock: true, autoLockDelay: NaN }, now), now);
    });

    it("restores from a fresh store instance and preserves the original lock deadline", async () => {
        const data: Record<string, unknown> = {};
        let alarm: { name: string; when?: number } | undefined;
        const storage = {
            get: async () => ({ ...data }),
            set: async (items: Record<string, unknown>) => {
                Object.assign(data, JSON.parse(JSON.stringify(items)));
            },
            remove: async () => {
                delete data[sessionKey];
            },
        };
        const alarms = {
            clear: async () => {
                alarm = undefined;
                return true;
            },
            create: (name: string | undefined, info: { when?: number }) => {
                alarm = { name: name!, when: info.when };
            },
        };
        await new SessionStore(storage, alarms).write(session);
        assert.deepEqual(alarm, { name: autoLockAlarm, when: session.expiresAt });

        // Simulate a worker losing every global and Chrome losing its alarm.
        alarm = undefined;
        const restarted = new SessionStore(storage, alarms);
        const restored = (await restarted.read())!;
        await restarted.schedule(restored);
        assert.deepEqual(restored, session);
        assert.equal(alarm!.when, session.expiresAt);
        assert.equal(isValidSession(restored, "account-1", session.expiresAt!), false);

        await restarted.write({ ...session, expiresAt: null });
        assert.equal(alarm, undefined);
        await restarted.clear();
        assert.equal(await restarted.read(), undefined);
        assert.deepEqual(data, {});
    });
});
