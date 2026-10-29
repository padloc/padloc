import { strict as assert } from "assert";
import { BiometricHandoff } from "../src/biometric-handoff";

function fixture() {
    const session: Record<string, any> = {};
    const calls: any[] = [];
    const browser = {
        runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
        storage: {
            session: {
                get: async (key: string) => ({ [key]: session[key] }),
                set: async (value: any) => Object.assign(session, value),
                remove: async (key: string) => {
                    delete session[key];
                },
            },
        },
        windows: {
            get: async (id: number) => ({ id, type: "normal" }),
            create: async (options: any) => {
                calls.push(["create", options]);
                return { id: 20, tabs: [{ id: 30 }] };
            },
            update: async (id: number, options: any) => {
                calls.push(["focus", id, options]);
            },
            remove: async (id: number) => {
                calls.push(["close", id]);
            },
        },
        action: {
            openPopup: async (options: any) => {
                calls.push(["popup", options]);
            },
        },
    };
    return { session, calls, browser, handoff: new BiometricHandoff(browser as any, async () => "unguessable-token") };
}

describe("Firefox biometric window handoff", () => {
    it("survives background recreation, binds the helper/account, and restores the original popup once", async () => {
        const f = fixture();
        await f.handoff.start(10, "account");
        assert.equal(f.calls[0][1].focused, false);
        assert.match(f.calls[0][1].url, /popup.html\?biometric=1&handoff=unguessable-token/);
        const restored = new BiometricHandoff(f.browser as any, async () => "other");
        assert.equal(await restored.valid("unguessable-token", 31, "account"), false);
        assert.equal(await restored.valid("other", 30, "account"), false);
        assert.equal(await restored.valid("unguessable-token", 30, "other-account"), false);
        assert.equal(await restored.focus("unguessable-token", 30, "account"), true);
        const completed = await restored.complete("unguessable-token", 30, "account");
        assert.ok(completed);
        // State is consumed before UI work; opening a popup must happen after
        // releasing the background state queue.
        assert.equal(
            f.calls.some((call) => call[0] === "popup"),
            false
        );
        await restored.reopen(completed);
        assert.deepEqual(f.calls.slice(-3), [
            ["close", 20],
            ["focus", 10, { focused: true }],
            ["popup", { windowId: 10 }],
        ]);
        assert.equal(await restored.complete("unguessable-token", 30, "account"), false);
    });

    it("rejects canceled and expired handoffs without opening a popup", async () => {
        const f = fixture();
        await f.handoff.start(10, "account");
        Object.values(f.session)[0].expiresAt = 0;
        assert.equal(await f.handoff.focus("unguessable-token", 30, "account"), false);
        assert.equal(await f.handoff.complete("unguessable-token", 30, "account"), false);
        await f.handoff.cancel();
        assert.equal(await f.handoff.valid("unguessable-token", 30, "account"), false);
        assert.equal(f.calls.filter((call) => call[0] === "popup").length, 0);
    });
    it("returns expired or failed attempts to the popup without accepting a different helper", async () => {
        const f = fixture();
        await f.handoff.start(10, "account");
        Object.values(f.session)[0].expiresAt = 0;
        assert.equal(await f.handoff.abort("wrong-token", 30), false);
        assert.equal(await f.handoff.abort("unguessable-token", 31), false);
        const canceled = await f.handoff.abort("unguessable-token", 30);
        assert.ok(canceled);
        await f.handoff.reopen(canceled);
        assert.deepEqual(f.calls.slice(-3), [
            ["close", 20],
            ["focus", 10, { focused: true }],
            ["popup", { windowId: 10 }],
        ]);
        assert.equal(await f.handoff.abort("unguessable-token", 30), false);
        assert.equal(await f.handoff.valid("unguessable-token", 30, "account"), false);
    });
});
