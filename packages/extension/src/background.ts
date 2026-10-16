import browser, { Menus, Runtime } from "webextension-polyfill";
import { setPlatform } from "@padloc/core/src/platform";
import { App } from "@padloc/core/src/app";
import { base64ToBytes } from "@padloc/core/src/encoding";
import { uuid } from "@padloc/core/src/util";
import { BackgroundPlatform } from "./background-platform";
import { FetchSender } from "./fetch";
import { isMessage, Message, messageTab } from "./message";
import { autoLockAlarm, isValidUnlockState, lockDeadline, UnlockStateStore, UnlockState } from "./unlock-state";
import { ExtensionSessionStorage } from "./storage";

setPlatform(new BackgroundPlatform());

class ExtensionBackground {
    app = new App(new FetchSender(process.env.PL_SERVER_URL!));
    private _unlockStateStore = new UnlockStateStore(new ExtensionSessionStorage(), browser.alarms);
    private _queue: Promise<unknown> = Promise.resolve();
    private _ready: Promise<void>;

    constructor() {
        // Register listeners synchronously on every worker start. Every handler
        // waits for initialization and runs serially to avoid lock/unlock races.
        browser.runtime.onMessage.addListener((msg: unknown, sender: Runtime.MessageSender) => {
            if (
                !isMessage(msg) ||
                sender.id !== browser.runtime.id ||
                sender.url?.split(/[?#]/)[0] !== browser.runtime.getURL("popup.html")
            ) {
                return;
            }
            // popup.html is also a trusted extension page when opened in a
            // browser tab. Content scripts have the host page's sender URL,
            // so the exact extension URL check still excludes them.
            return this._run(() => this._handleMessage(msg));
        });
        browser.tabs.onUpdated.addListener(() => this._refresh());
        browser.tabs.onActivated.addListener(() => this._refresh());
        browser.contextMenus.onClicked.addListener((info: Menus.OnClickData) => {
            this._run(async () => {
                await this._restoreUnlockState();
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
        // Do not log messages or unlock state data, which can contain secrets.
        console.error("Padloc background operation failed.");
    }

    private _refresh() {
        this._run(async () => {
            await this._restoreUnlockState();
            await this._update();
        }).catch(() => this._reportError());
    }

    private async _restoreUnlockState(): Promise<UnlockState | null> {
        const unlockState = await this._unlockStateStore.read();
        if (!unlockState) {
            if (!this.app.state.locked) {
                await this._lock();
            }
            return null;
        }
        if (!isValidUnlockState(unlockState, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        try {
            if (this.app.state.locked) {
                // The popup already synchronizes. Restoring a worker must not
                // start a second sync that could race a lock or a popup save.
                await this.app.unlockWithMasterKey(base64ToBytes(unlockState.masterKey), false);
            }
            // Crypto/storage operations can outlast the deadline too.
            if (!isValidUnlockState(unlockState, this.app.account?.id)) {
                await this._lock();
                return null;
            }
        } catch (e) {
            await this._lock();
            return null;
        }
        await this._unlockStateStore.schedule(unlockState);
        return unlockState;
    }

    private async _lock() {
        await this._unlockStateStore.clear();
        await this.app.lock();
        await browser.runtime.sendMessage({ type: "unlockStateCleared" }).catch(() => {});
        await this._update();
    }

    private async _touch(unlockState: UnlockState) {
        // An awaited browser API can resume after sleep, past the old deadline.
        if (!isValidUnlockState(unlockState, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        unlockState.lastActivity = Date.now();
        unlockState.expiresAt = lockDeadline(this.app.settings, unlockState.lastActivity);
        if (!isValidUnlockState(unlockState, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        await this._unlockStateStore.write(unlockState);
        if (!isValidUnlockState(unlockState, this.app.account?.id)) {
            await this._lock();
            return null;
        }
        return unlockState;
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
                const unlockState = new UnlockState({
                    unlockId: await uuid(),
                    accountId: msg.accountId,
                    masterKey: msg.masterKey,
                    lastActivity: Date.now(),
                    expiresAt: null,
                });
                if (!(await this._touch(unlockState))) {
                    return null;
                }
                await this._update();
                return { id: unlockState.unlockId };
            }
            case "requestMasterKey": {
                const unlockState = await this._restoreUnlockState();
                if (!unlockState) {
                    return null;
                }
                if (!(await this._touch(unlockState))) {
                    return null;
                }
                return { id: unlockState.unlockId, masterKey: unlockState.masterKey };
            }
            case "activity": {
                const unlockState = await this._restoreUnlockState();
                // A delayed popup message cannot revive an expired/older unlock state.
                if (!unlockState || unlockState.unlockId !== msg.unlockId) {
                    return false;
                }
                return !!(await this._touch(unlockState));
            }
            case "state-changed": {
                await this.app.load(false);
                const unlockState = await this._restoreUnlockState();
                if (unlockState) {
                    unlockState.expiresAt = lockDeadline(this.app.settings, unlockState.lastActivity);
                    if (!isValidUnlockState(unlockState, this.app.account?.id)) {
                        await this._lock();
                    } else {
                        await this._unlockStateStore.write(unlockState);
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
            await browser.action.openPopup?.();
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
        if (await this._restoreUnlockState()) {
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
        // Safari controls the badge color; tolerate hosts without the color API.
        await browser.action.setBadgeBackgroundColor?.({ color: "#ff6666" });
        await browser.action.setIcon({ path: this.app.account ? "icon.png" : "icon-grayscale.png" });
        await browser.action.setTitle({ title: this.app.account ? process.env.PL_APP_NAME || "" : "Please Log In" });
        await browser.contextMenus.removeAll();
        if (!count || !this.app.state.loggedIn) {
            return;
        }
        if (this.app.state.locked) {
            const canOpenPopup = typeof browser.action.openPopup === "function";
            await browser.contextMenus.create({
                id: "openPopup",
                title: `${count > 1 ? `${count} items` : "1 item"} found${canOpenPopup ? "" : " (unlock to view)"}`,
                enabled: canOpenPopup,
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
