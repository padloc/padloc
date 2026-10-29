import type browser from "webextension-polyfill";

const storageKey = "pl_biometricHandoff";
interface PendingHandoff {
    token: string;
    accountId: string;
    originWindowId: number;
    helperWindowId: number;
    helperTabId: number;
    expiresAt: number;
}

// Only metadata lives here. Unlock keys stay in the existing session unlock store.
export class BiometricHandoff {
    constructor(private _browser: typeof browser, private _newToken: () => Promise<string>) {}

    async start(originWindowId: number, accountId: string) {
        const origin = await this._browser.windows.get(originWindowId);
        if (origin.type !== "normal") throw new Error("Open biometric unlock from a browser window.");
        const previous = await this._read();
        await this.cancel();
        if (previous) await this._browser.windows.remove(previous.helperWindowId).catch(() => {});
        const token = await this._newToken();
        const helper = await this._browser.windows.create({
            url: this._browser.runtime.getURL(`popup.html?biometric=1&handoff=${encodeURIComponent(token)}`),
            type: "popup",
            width: 240,
            height: 140,
            ...(typeof origin.left === "number" &&
            typeof origin.top === "number" &&
            typeof origin.width === "number" &&
            typeof origin.height === "number"
                ? {
                      left: Math.round(origin.left + (origin.width - 240) / 2),
                      top: Math.round(origin.top + Math.max(0, (origin.height - 140) / 3)),
                  }
                : {}),
            // Start behind the browser; the helper requests focus before WebAuthn.
            focused: false,
        });
        const helperTabId = helper.tabs?.[0]?.id;
        if (helper.id == null || helperTabId == null) {
            if (helper.id != null) await this._browser.windows.remove(helper.id).catch(() => {});
            throw new Error("Could not open the biometric authentication window.");
        }
        await this._browser.storage.session.set({
            [storageKey]: {
                token,
                accountId,
                originWindowId,
                helperWindowId: helper.id,
                helperTabId,
                expiresAt: Date.now() + 120000,
            },
        });
        return true;
    }

    async valid(token: string, tabId: number | undefined, accountId: string | undefined) {
        const pending = await this._read();
        return (
            !!pending &&
            pending.token === token &&
            pending.helperTabId === tabId &&
            pending.accountId === accountId &&
            pending.expiresAt > Date.now()
        );
    }

    async focus(token: string, tabId: number | undefined, accountId: string | undefined) {
        if (!(await this.valid(token, tabId, accountId))) return false;
        const pending = (await this._read())!;
        await this._browser.windows.update(pending.helperWindowId, { focused: true });
        return true;
    }

    async complete(token: string, tabId: number | undefined, accountId: string | undefined) {
        if (!(await this.valid(token, tabId, accountId))) return false;
        const pending = (await this._read())!;
        // Consume before UI changes so completion cannot be replayed.
        await this.cancel();
        return pending;
    }

    async abort(token: string, tabId: number | undefined) {
        const pending = await this._read();
        // An expired attempt still needs to close its own window and return to
        // the toolbar. It never grants access to session key material.
        if (!pending || pending.token !== token || pending.helperTabId !== tabId) return false;
        await this.cancel();
        return pending;
    }

    async reopen(pending: PendingHandoff) {
        await this._browser.windows.remove(pending.helperWindowId).catch(() => {});
        await this._browser.windows.update(pending.originWindowId, { focused: true });
        await this._browser.action.openPopup({ windowId: pending.originWindowId });
        return true;
    }

    async cancel() {
        await this._browser.storage.session.remove(storageKey);
    }

    private async _read(): Promise<PendingHandoff | undefined> {
        const value = (await this._browser.storage.session.get(storageKey))[storageKey];
        if (!value || typeof value !== "object") return;
        const pending = value as Partial<PendingHandoff>;
        if (
            typeof pending.token !== "string" ||
            typeof pending.accountId !== "string" ||
            !Number.isInteger(pending.originWindowId) ||
            !Number.isInteger(pending.helperWindowId) ||
            !Number.isInteger(pending.helperTabId) ||
            !Number.isFinite(pending.expiresAt)
        )
            return;
        return pending as PendingHandoff;
    }
}
