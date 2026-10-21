import browser, { Runtime } from "webextension-polyfill";
import { isMessage, UnlockResponse } from "./message";
import { Dialog } from "@padloc/app/src/elements/dialog";
import { App } from "@padloc/app/src/elements/app";
import { debounce } from "@padloc/core/src/util";
import { bytesToBase64, base64ToBytes } from "@padloc/core/src/encoding";
import { Storable } from "@padloc/core/src/storage";
import { VaultItem } from "@padloc/core/src/item";
// import { messageTab } from "./message";

const notifyStateChanged = debounce(() => {
    browser.runtime.sendMessage({
        type: "state-changed",
    });
}, 500);

class RouterState extends Storable {
    id = "";
    path = "";
    params: { [key: string]: string } = {};
    lastMatchingItems: string[] = [];

    constructor(vals: Partial<RouterState> = {}) {
        super();
        Object.assign(this, vals);
    }
}

export class ExtensionApp extends App {
    private _isLocked = true;
    private _isLoggedIn = false;
    private _unlockId?: string;
    private _unlockEpoch = 0;
    private _lastActivitySent = 0;

    private _onMessage = (msg: unknown, sender: Runtime.MessageSender) => {
        if (isMessage(msg) && sender.id === browser.runtime.id && !sender.tab && msg.type === "unlockStateCleared") {
            this._lockPopup();
        }
    };

    private _activity = async () => {
        const id = this._unlockId;
        if (!id || Date.now() - this._lastActivitySent < 1000) {
            return;
        }
        this._lastActivitySent = Date.now();
        try {
            const valid = await browser.runtime.sendMessage({ type: "activity", unlockId: id });
            if (!valid && this._unlockId === id) {
                await this._lockPopup();
            }
        } catch (e) {
            await this._lockPopup();
        }
    };

    private _visibilityChanged = () => {
        if (document.visibilityState === "visible") {
            this._lastActivitySent = 0;
            this._activity();
        }
    };

    connectedCallback() {
        browser.runtime.onMessage.addListener(this._onMessage);
        document.addEventListener("click", this._activity);
        document.addEventListener("keydown", this._activity);
        document.addEventListener("visibilitychange", this._visibilityChanged);
        super.connectedCallback();
    }

    disconnectedCallback() {
        browser.runtime.onMessage.removeListener(this._onMessage);
        document.removeEventListener("click", this._activity);
        document.removeEventListener("keydown", this._activity);
        document.removeEventListener("visibilitychange", this._visibilityChanged);
        super.disconnectedCallback();
    }

    private async _lockPopup() {
        this._unlockEpoch++;
        this._unlockId = undefined;
        this._isLocked = true;
        Dialog.closeAll();
        await this.app.lock();
        if (this.app.state.loggedIn) {
            this.router.go("unlock");
        }
    }

    private get _matchingItems() {
        return this.app.state.context.browser?.url ? this.app.getItemsForUrl(this.app.state.context.browser.url) : [];
    }

    async load() {
        await super.load();

        if (this.app.state.locked) {
            const epoch = this._unlockEpoch;
            const unlockState = (await browser.runtime.sendMessage({
                type: "requestMasterKey",
            })) as UnlockResponse | null;
            if (unlockState?.masterKey && epoch === this._unlockEpoch) {
                // Restoration is not a new unlock: never send the key back to
                // recreate unlock state after the previous unlock has expired.
                this._unlockId = unlockState.id;
                this._isLocked = false;
                await this.app.unlockWithMasterKey(base64ToBytes(unlockState.masterKey));
                if (epoch !== this._unlockEpoch) {
                    await this._lockPopup();
                }
            }
        }

        const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
        this.app.state.context.browser = tab;

        const routerState = await this._getRouterState();
        const matchingItems = this._matchingItems;
        const hasNewMatchingItems =
            matchingItems.length !== routerState.lastMatchingItems.length ||
            matchingItems.some(({ item }) => !routerState.lastMatchingItems.includes(item.id));

        if (
            matchingItems.length &&
            (hasNewMatchingItems || (routerState.path === "items" && !routerState.params.search))
        ) {
            this.router.go("items", { host: "true" }, true);
            this._saveRouterState();
        } else {
            this.router.go(routerState.path, routerState.params, true);
        }

        this.router.addEventListener("route-changed", () => this._saveRouterState());
        this.router.addEventListener("params-changed", () => this._saveRouterState());

        // this.addEventListener("field-clicked", (e: any) => this._fieldClicked(e));
        this.addEventListener("field-dragged", (e: any) => this._fieldDragged(e));

        // this._autoFill(
        //     new CustomEvent("auto-fill", {
        //         detail: {
        //             item: {
        //                 name: "Test",
        //                 fields: [
        //                     { name: "username", value: "martin@maklesoft.com" },
        //                     { name: "password", value: "mypassword" }
        //                 ]
        //             } as VaultItem,
        //             index: 0
        //         }
        //     })
        // );
    }

    async stateChanged() {
        super.stateChanged();
        notifyStateChanged();
        if (this._isLocked !== this.app.state.locked) {
            this._isLocked = this.app.state.locked;
            this._isLocked ? this._locked() : this._unlocked();
        }

        if (this._isLoggedIn !== this.app.state.loggedIn) {
            this._isLoggedIn = this.app.state.loggedIn;
            this._isLoggedIn ? this._loggedIn() : this._loggedOut();
        }
    }

    async _unlocked() {
        if (!this.state.account || !this.state.account.masterKey) {
            return;
        }
        const epoch = this._unlockEpoch;
        const accountId = this.state.account.id;
        const masterKey = bytesToBase64(this.state.account.masterKey);
        this._wrapper.classList.toggle("active", true);
        try {
            await this.app.save();
            if (epoch !== this._unlockEpoch || this.app.state.locked) {
                return;
            }
            const unlockState = (await browser.runtime.sendMessage({
                type: "unlocked",
                accountId,
                masterKey,
            })) as UnlockResponse | null;
            if (epoch === this._unlockEpoch && unlockState) {
                this._unlockId = unlockState.id;
            } else {
                await this._lockPopup();
            }
        } catch (e) {
            await this._lockPopup();
        }
    }

    _locked() {
        this._unlockEpoch++;
        this._unlockId = undefined;
        browser.runtime.sendMessage({
            type: "locked",
        });
    }

    _loggedIn() {
        browser.runtime.sendMessage({
            type: "loggedIn",
        });
    }

    _loggedOut() {
        browser.runtime.sendMessage({
            type: "loggedOut",
        });
    }

    private async _getRouterState() {
        try {
            return await this.app.storage.get(RouterState, "");
        } catch (e) {
            return new RouterState();
        }
    }

    private async _saveRouterState() {
        const { host, ...params } = this.router.params;
        const lastMatchingItems = this._matchingItems.map(({ item }) => item.id);
        await this.app.storage.save(new RouterState({ path: this.router.path, params, lastMatchingItems }));
    }

    protected async _fieldDragged(e: CustomEvent<{ item: VaultItem; index: number; event: DragEvent }>) {
        super._fieldDragged(e);

        const event = e.detail.event;

        const dragleave = () => {
            document.body.style.width = "0";
            document.body.style.height = "0";
            document.body.style.opacity = "0";
        };

        const dragend = () => {
            document.body.style.width = "";
            document.body.style.height = "";
            document.body.style.opacity = "1";
            document.removeEventListener("dragleave", dragleave);
        };

        // const drag = (e: DragEvent) => {
        //     console.log("drag", e);
        // };

        document.addEventListener("dragleave", dragleave, { once: true });
        event.target!.addEventListener("dragend", dragend, { once: true });
        // document.addEventListener("drag", drag);

        // const field = item.fields[index];
        // const value = await transformedValue(field);
        //
        // await messageTab({
        //     type: "fillOnDrop",
        //     value
        // });
    }
}

customElements.define("pl-extension-app", ExtensionApp);
