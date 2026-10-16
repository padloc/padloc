import { strict as assert } from "assert";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { runInNewContext } from "vm";
import { Account, UnlockedAccount } from "@padloc/core/src/account";
import { AppState } from "@padloc/core/src/app";
import { Vault } from "@padloc/core/src/vault";
import { Field, FieldType, VaultItem } from "@padloc/core/src/item";
import { Session } from "@padloc/core/src/session";
import { StubPlatform, setPlatform } from "@padloc/core/src/platform";
import { bytesToBase64 } from "@padloc/core/src/encoding";
import { autoLockAlarm, sessionKey } from "../src/session";

if (Number(process.versions.node.split(".")[0]) < 18) {
    throw new Error("Worker bundle tests require Node.js 18+ for stable WebCrypto support.");
}
const webcrypto = require("crypto").webcrypto;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const { WebCryptoProvider } = require("@padloc/app/src/lib/crypto");

function event() {
    const listeners: Array<(...args: any[]) => any> = [];
    return {
        listeners,
        addListener: (listener: (...args: any[]) => any) => listeners.push(listener),
        emit: (...args: any[]) => listeners.map((listener) => listener(...args)),
    };
}

function storageArea(data: Record<string, any>) {
    return {
        get: async (keys?: string | string[] | null) => {
            const selected = keys == null ? Object.keys(data) : typeof keys === "string" ? [keys] : keys;
            return JSON.parse(
                JSON.stringify(Object.fromEntries(selected.filter((key) => key in data).map((key) => [key, data[key]])))
            );
        },
        set: async (items: Record<string, unknown>) => Object.assign(data, JSON.parse(JSON.stringify(items))),
        remove: async (key: string) => {
            delete data[key];
        },
        setAccessLevel: async ({ accessLevel }: { accessLevel: string }) =>
            assert.equal(accessLevel, "TRUSTED_CONTEXTS"),
    };
}

// Execute the production bundle without window, document, XMLHttpRequest or
// chunk loaders. Every start gets a fresh JS global and real WebCrypto.
function startWorker(local: Record<string, any>, session: Record<string, any>, clock: { now: number }) {
    const alarms = new Map<string, { when: number }>();
    const menus = new Map<string, any>();
    const notifications: any[] = [],
        fills: any[] = [],
        injections: any[] = [];
    let badge = "";
    const browser = {
        runtime: {
            id: "padloc-test",
            getURL: (path: string) => `chrome-extension://padloc-test/${path}`,
            onMessage: event(),
            sendMessage: async (msg: unknown) => {
                notifications.push(msg);
            },
        },
        storage: { local: storageArea(local), session: storageArea(session) },
        alarms: {
            onAlarm: event(),
            clear: async (name: string) => alarms.delete(name),
            create: async (name: string, info: { when: number }) => {
                alarms.set(name, info);
            },
        },
        tabs: {
            onUpdated: event(),
            onActivated: event(),
            query: async () => [{ id: 1, url: "https://example.com/login" }],
            sendMessage: async (_id: number, msg: { type: string }) => {
                if (msg.type === "isContentReady") return false;
                fills.push(msg);
                return true;
            },
        },
        contextMenus: {
            onClicked: event(),
            removeAll: async () => menus.clear(),
            create: async (menu: { id: string }) => {
                menus.set(menu.id, menu);
            },
        },
        action: {
            setBadgeText: async ({ text }: { text: string }) => {
                badge = text;
            },
            setBadgeBackgroundColor: async () => {},
            setIcon: async () => {},
            setTitle: async () => {},
            openPopup: async () => {},
        },
        scripting: {
            executeScript: async (details: unknown) => {
                injections.push(details);
            },
        },
    };
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const errors: unknown[] = [];
    const context: Record<string, any> = {
        browser,
        chrome: browser,
        crypto: webcrypto,
        TextEncoder,
        TextDecoder,
        URL,
        navigator: { userAgent: "Chrome/127.0", language: "en" },
        console: { ...console, error: (...args: unknown[]) => errors.push(args) },
        Date: class extends Date {
            static now() {
                return clock.now;
            }
        },
        setTimeout: (fn: () => void, delay: number) => {
            const timer = setTimeout(fn, Math.max(0, delay));
            timers.add(timer);
            return timer;
        },
        clearTimeout,
    };
    context.self = context;
    runInNewContext(readFileSync(resolve(__dirname, "../dist/background.js"), "utf8"), context);
    const sender = { id: browser.runtime.id, url: browser.runtime.getURL("popup.html") };
    return {
        browser,
        alarms,
        menus,
        notifications,
        fills,
        injections,
        errors,
        get badge() {
            return badge;
        },
        message: (msg: unknown, source: unknown = sender) => browser.runtime.onMessage.listeners[0](msg, source),
        stop: () => timers.forEach(clearTimeout),
    };
}

describe("built MV3 worker lifecycle", function () {
    this.timeout(20000);
    let local: Record<string, any>, session: Record<string, any>, clock: { now: number };
    let worker: ReturnType<typeof startWorker>, masterKey: string, stateKey: string;
    const unlock = () => worker.message({ type: "unlocked", masterKey, accountId: "test-account" });
    const requestKey = () => worker.message({ type: "requestMasterKey" });
    const flush = () => worker.message({ type: "activity", sessionId: "old-session" });

    before(async () => {
        setPlatform(Object.assign(new StubPlatform(), { crypto: new WebCryptoProvider() }));
        const account = new Account();
        account.id = "test-account";
        account.email = "mv3@example.com";
        await account.initialize("a test-only master password");
        masterKey = bytesToBase64(account.masterKey!);
        const vault = new Vault();
        vault.id = "test-vault";
        vault.name = "My Vault";
        await vault.unlock(account as UnlockedAccount);
        const item = new VaultItem({
            id: "test-item",
            name: "Example Login",
            fields: [
                new Field({ type: FieldType.Password, name: "Password", value: "test-only-secret" }),
                new Field({ type: FieldType.Url, name: "URL", value: "https://example.com" }),
            ],
        });
        vault.items.update(item);
        await vault.commit();
        account.mainVault = { id: vault.id };
        const state = new AppState();
        state.account = account;
        state.vaults = [vault];
        state.session = Object.assign(new Session(), {
            id: "test-login",
            account: account.id,
            key: new Uint8Array(32),
        });
        state.settings.extensionBadge = true;
        await state.index.fromItems([item]);
        stateKey = `${state.kind}_${state.id}`;
        local = { [stateKey]: state.toRaw() };
        session = {};
        clock = { now: Date.now() };
        worker = startWorker(local, session, clock);
    });
    after(() => worker?.stop());

    it("starts locked, then stores a genuine unlock only in session memory", async () => {
        const originalSnapshot = JSON.stringify(local);
        assert.equal(await requestKey(), null);
        assert.equal(JSON.stringify(local), originalSnapshot, "background reads must not overwrite popup storage");
        assert.ok((await unlock()).id);
        assert.equal(session[sessionKey].masterKey, masterKey);
        for (const secret of [masterKey, "test-only-secret", "a test-only master password"]) {
            assert.equal(JSON.stringify(local).includes(secret), false);
        }
        assert.equal(worker.badge, "1");
        assert.equal(worker.menus.get("item/test-item").title, "Example Login");
    });

    it("restores after termination without renewing the deadline, recreating lost alarms", async () => {
        const original = { ...session[sessionKey] };
        worker.stop();
        clock.now += 30000;
        worker = startWorker(local, session, clock);
        assert.equal(await flush(), false);
        assert.equal(session[sessionKey].id, original.id);
        assert.equal(session[sessionKey].expiresAt, original.expiresAt);
        assert.equal(worker.alarms.get(autoLockAlarm)!.when, original.expiresAt);
        const response = await requestKey();
        assert.equal(response.masterKey, masterKey);
        assert.equal(response.id, original.id);
    });

    it("injects the packaged content script and fills from the restored vault", async () => {
        worker.browser.contextMenus.onClicked.emit({ menuItemId: "item/test-item/0" });
        await flush();
        assert.deepEqual(JSON.parse(JSON.stringify(worker.injections)), [
            { target: { tabId: 1 }, files: ["content.js"] },
        ]);
        assert.deepEqual(JSON.parse(JSON.stringify(worker.fills)), [{ type: "fillActive", value: "test-only-secret" }]);
    });

    it("shares unlock sessions with the extension UI opened in a tab", async () => {
        const sender = {
            id: "padloc-test",
            url: "chrome-extension://padloc-test/popup.html?view=tab#items",
            tab: { id: 2 },
        };
        const opened = await worker.message({ type: "unlocked", masterKey, accountId: "test-account" }, sender);
        assert.ok(opened?.id);
        assert.equal((await requestKey()).masterKey, masterKey);
        assert.equal((await worker.message({ type: "requestMasterKey" }, sender)).id, opened.id);
        assert.equal(await worker.message({ type: "activity", sessionId: opened.id }, sender), true);
        await worker.message({ type: "locked" }, sender);
        assert.equal(await requestKey(), null);
        assert.ok(worker.notifications.some((msg) => msg.type === "sessionLocked"));
        await unlock();
    });

    it("rejects content scripts, other pages, external senders, and malformed messages", async () => {
        for (const sender of [
            { id: "padloc-test", url: "https://example.com", tab: { id: 1 } },
            { id: "padloc-test", url: "chrome-extension://padloc-test/content.js" },
            { id: "padloc-test", url: "chrome-extension://padloc-test/popup.html.evil", tab: { id: 2 } },
            { id: "padloc-test", tab: { id: 2 } },
            { id: "another-extension", url: "chrome-extension://padloc-test/popup.html" },
        ]) {
            assert.equal(await worker.message({ type: "requestMasterKey" }, sender), undefined);
            assert.equal(
                await worker.message({ type: "unlocked", masterKey, accountId: "test-account" }, sender),
                undefined
            );
        }
        assert.equal(await worker.message({ type: "unlocked" }), undefined);
        assert.equal(await worker.message(null), undefined);
    });

    it("locks without an alarm at the deadline and rejects delayed activity and fills", async () => {
        const id = session[sessionKey].id;
        clock.now = session[sessionKey].expiresAt;
        assert.equal(await worker.message({ type: "activity", sessionId: id }), false);
        assert.equal(await requestKey(), null);
        assert.equal(session[sessionKey], undefined);
        assert.equal(worker.menus.has("item/test-item"), false);
        worker.browser.contextMenus.onClicked.emit({ menuItemId: "item/test-item/0" });
        await requestKey();
        assert.equal(worker.fills.length, 1);
        assert.ok(worker.notifications.some((msg) => msg.type === "sessionLocked"));
    });

    it("propagates alarm and manual locks", async () => {
        await unlock();
        clock.now = session[sessionKey].expiresAt;
        worker.browser.alarms.onAlarm.emit({ name: autoLockAlarm });
        assert.equal(await requestKey(), null);
        assert.equal(session[sessionKey], undefined);
        await unlock();
        await worker.message({ type: "locked" });
        assert.equal(session[sessionKey], undefined);
        assert.equal(worker.alarms.size, 0);
        assert.equal(await requestKey(), null);
        assert.equal(worker.menus.has("item/test-item"), false);
    });

    it("does not renew a session that expires during an awaited browser call", async () => {
        await unlock();
        const deadline = session[sessionKey].expiresAt;
        const createAlarm = worker.browser.alarms.create;
        worker.browser.alarms.create = async (name, info) => {
            clock.now = deadline;
            return createAlarm(name, info);
        };
        assert.equal(await requestKey(), null);
        assert.equal(session[sessionKey], undefined);
        worker.browser.alarms.create = createAlarm;
    });

    it("preserves disabled auto-lock across workers, while browser restart locks", async () => {
        local[stateKey].settings.autoLock = false;
        await worker.message({ type: "state-changed" });
        await unlock();
        assert.equal(session[sessionKey].expiresAt, null);
        worker.stop();
        clock.now += 86400000;
        worker = startWorker(local, session, clock);
        assert.equal((await requestKey()).masterKey, masterKey);
        worker.stop();
        session = {}; // The browser clears session storage on restart.
        worker = startWorker(local, session, clock);
        assert.equal(await requestKey(), null);
    });

    it("clears unlock material on account changes and logout", async () => {
        await unlock();
        local[stateKey].account.id = "different-account";
        await worker.message({ type: "state-changed" });
        assert.equal(await requestKey(), null);
        assert.equal(session[sessionKey], undefined);
        local[stateKey].account.id = "test-account";
        await unlock();
        await worker.message({ type: "loggedOut" });
        assert.equal(await requestKey(), null);
        assert.equal(session[sessionKey], undefined);
        assert.deepEqual(worker.errors, []);
    });
});

describe("Chromium MV3 package", () => {
    it("declares MV3 APIs and exposes only packaged content-script resources", () => {
        const directory = resolve(__dirname, "../dist");
        const manifest = JSON.parse(readFileSync(resolve(directory, "manifest.json"), "utf8"));
        assert.equal(manifest.manifest_version, 3);
        assert.equal(manifest.background.service_worker, "background.js");
        assert.equal(manifest.browser_action, undefined);
        assert.ok(manifest.action.default_popup);
        assert.ok(manifest.commands._execute_action);
        assert.ok(manifest.permissions.includes("scripting"));
        assert.ok(manifest.content_security_policy.extension_pages.includes("frame-src 'self' blob:"));
        for (const resource of manifest.web_accessible_resources[0].resources) {
            assert.ok(existsSync(resolve(directory, resource)), `Missing content resource: ${resource}`);
        }
    });
});
