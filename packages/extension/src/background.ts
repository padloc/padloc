import browser, { Menus, Runtime } from "webextension-polyfill";
import { setPlatform } from "@padloc/core/src/platform";
import { App } from "@padloc/core/src/app";
import { base64ToBytes } from "@padloc/core/src/encoding";
import { uuid } from "@padloc/core/src/util";
import { BackgroundPlatform } from "./background-platform";
import { FetchSender } from "./fetch";
import { isMessage, Message, messageTab } from "./message";
import { autoLockAlarm, isValidSession, lockDeadline, SessionStore, UnlockSession } from "./session";

setPlatform(new BackgroundPlatform());

class ExtensionBackground {
    app = new App(new FetchSender(process.env.PL_SERVER_URL!));
    private _sessions = new SessionStore(browser.storage.session, browser.alarms);
    private _queue: Promise<unknown> = Promise.resolve();
    private _ready: Promise<void>;

    constructor() {
        // Register listeners synchronously on every worker start. Every handler
        // waits for initialization and runs serially to avoid lock/unlock races.
        browser.runtime.onMessage.addListener((msg: unknown, sender: Runtime.MessageSender) => {
            if (
                !isMessage(msg) ||
                sender.tab ||
                sender.id !== browser.runtime.id ||
                sender.url?.split(/[?#]/)[0] !== browser.runtime.getURL("popup.html")
            ) {
                return;
            }
            return this._run(() => this._handleMessage(msg));
        });
        browser.tabs.onUpdated.addListener(() => this._refresh());
        browser.tabs.onActivated.addListener(() => this._refresh());
        browser.contextMenus.onClicked.addListener((info: Menus.OnClickData) => {
            this._run(async () => {
                await this._restoreSession();
                await this._contextMenuClicked(info.menuItemId as string);
            }).catch(() => this._reportError());
        });
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === autoLockAlarm) {
                this._refresh();
            }
        });
        this._ready = this._initialize();
        this._refresh();
    }

    private async _initialize() {
        // Chrome supports explicitly restricting access; Firefox's session area
        // is already restricted and does not expose setAccessLevel.
        const sessionStorage = browser.storage.session as typeof browser.storage.session & {
            setAccessLevel?: (options: { accessLevel: string }) => Promise<void>;
        };
        await sessionStorage.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" });
        await this.app.load(false);
    }

    private _run<T>(fn: () => Promise<T>): Promise<T> {
        const result = this._queue.then(async () => {
            await this._ready;
            return fn();
        });
        this._queue = result.catch(() => {});
        return result;
    }

    private _reportError() {
        // Do not log messages or session data, which can contain secrets.
        console.error("Padloc background operation failed.");
    }

    private _refresh() {
        this._run(async () => {
            await this._restoreSession();
            await this._update();
        }).catch(() => this._reportError());
    }

    private async _restoreSession(): Promise<UnlockSession | null> {
        const session = await this._sessions.read();
        if (!session) {
            if (!this.app.state.locked) {
                await this._lock();
            }
            return null;
        }
        if (!isValidSession(session, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        try {
            if (this.app.state.locked) {
                // The popup already synchronizes. Restoring a worker must not
                // start a second sync that could race a lock or a popup save.
                await this.app.unlockWithMasterKey(base64ToBytes(session.masterKey), false);
            }
            // Crypto/storage operations can outlast the deadline too.
            if (!isValidSession(session, this.app.account?.id)) {
                await this._lock();
                return null;
            }
        } catch (e) {
            await this._lock();
            return null;
        }
        await this._sessions.schedule(session);
        return session;
    }

    private async _lock() {
        await this._sessions.clear();
        await this.app.lock();
        await browser.runtime.sendMessage({ type: "sessionLocked" }).catch(() => {});
        await this._update();
    }

    private async _touch(session: UnlockSession) {
        // An awaited browser API can resume after sleep, past the old deadline.
        if (!isValidSession(session, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        session.lastActivity = Date.now();
        session.expiresAt = lockDeadline(this.app.settings, session.lastActivity);
        if (!isValidSession(session, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        await this._sessions.write(session);
        if (!isValidSession(session, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        return session;
    }

    private async _handleMessage(msg: Message) {
        switch (msg.type) {
            case "locked":
            case "loggedOut":
                await this._lock();
                await this.app.load(false);
                break;
            case "unlocked": {
                // The popup saves its encrypted snapshot before sending this.
                await this.app.load(false);
                if (!this.app.account || this.app.account.id !== msg.accountId) {
                    return null;
                }
                await this.app.unlockWithMasterKey(base64ToBytes(msg.masterKey), false);
                const session: UnlockSession = {
                    id: await uuid(),
                    accountId: msg.accountId,
                    masterKey: msg.masterKey,
                    lastActivity: Date.now(),
                    expiresAt: null,
                };
                if (!(await this._touch(session))) {
                    return null;
                }
                await this._update();
                return { id: session.id };
            }
            case "requestMasterKey": {
                const session = await this._restoreSession();
                if (!session) {
                    return null;
                }
                if (!(await this._touch(session))) {
                    return null;
                }
                return { id: session.id, masterKey: session.masterKey };
            }
            case "activity": {
                const session = await this._restoreSession();
                // A delayed popup message cannot revive an expired/older session.
                if (!session || session.id !== msg.sessionId) {
                    return false;
                }
                return !!(await this._touch(session));
            }
            case "state-changed": {
                await this.app.load(false);
                const session = await this._restoreSession();
                if (session) {
                    session.expiresAt = lockDeadline(this.app.settings, session.lastActivity);
                    if (!isValidSession(session, this.app.account?.id)) {
                        await this._lock();
                    } else {
                        await this._sessions.write(session);
                    }
                }
                break;
            }
            default:
                return;
        }
        await this._update();
    }

    private async _getActiveTab() {
        const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
        return tab || null;
    }

    private async _contextMenuClicked(menuItemId: string) {
        if (menuItemId === "openPopup") {
            await browser.action.openPopup();
            return;
        }
        if (this.app.state.locked) {
            return;
        }
        const match = menuItemId.match(/^item\/([^\/]+)\/(\d+)$/);
        if (!match) {
            return;
        }
        const [, id, ind] = match;
        const item = this.app.getItem(id);
        const field = item?.item.fields[parseInt(ind, 10)];
        if (!field) {
            return;
        }
        const value = await field.transform();
        // TOTP calculation can be asynchronous: check expiry again before fill.
        if (await this._restoreSession()) {
            await messageTab({ type: "fillActive", value });
        }
    }

    private async _getCountForTab() {
        const tab = await this._getActiveTab();
        return tab?.url ? this.app.state.index.matchUrl(tab.url) : 0;
    }

    private async _update() {
        const count = await this._getCountForTab();
        await browser.action.setBadgeText({ text: count && this.app.settings.extensionBadge ? count.toString() : "" });
        await browser.action.setBadgeBackgroundColor({ color: "#ff6666" });
        await browser.action.setIcon({ path: this.app.account ? "icon.png" : "icon-grayscale.png" });
        await browser.action.setTitle({ title: this.app.account ? process.env.PL_APP_NAME || "" : "Please Log In" });
        await browser.contextMenus.removeAll();
        if (!count || !this.app.state.loggedIn) {
            return;
        }
        if (this.app.state.locked) {
            await browser.contextMenus.create({
                id: "openPopup",
                title: `${count > 1 ? `${count} items` : "1 item"} found`,
                contexts: ["editable"],
            });
        } else {
            const tab = await this._getActiveTab();
            const items = tab?.url ? this.app.getItemsForUrl(tab.url) : [];
            for (const { item } of items) {
                await browser.contextMenus.create({ id: `item/${item.id}`, title: item.name, contexts: ["editable"] });
                for (const [index, field] of item.fields.entries()) {
                    await browser.contextMenus.create({
                        parentId: `item/${item.id}`,
                        id: `item/${item.id}/${index}`,
                        title: field.name,
                        contexts: ["editable"],
                    });
                }
            }
        }
    }
}

new ExtensionBackground();
