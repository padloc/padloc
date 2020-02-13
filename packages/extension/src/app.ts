import { browser } from "webextension-polyfill-ts";
import { App } from "@padloc/app/src/elements/app";
import { debounce } from "@padloc/core/src/util";
import { bytesToBase64, base64ToBytes, base32ToBytes } from "@padloc/core/src/encoding";
import { Storable } from "@padloc/core/src/storage";
import { VaultItem } from "@padloc/core/src/item";
import { totp } from "@padloc/core/src/otp";
import { messageTab } from "./message";

const notifyStateChanged = debounce(() => {
    browser.runtime.sendMessage({
        type: "state-changed"
    });
}, 500);

class RouterState extends Storable {
    id = "";
    path = "";
    params: { [key: string]: string } = {};

    constructor(vals: Partial<RouterState>) {
        super();
        Object.assign(this, vals);
    }
}

export class ExtensionApp extends App {
    async load() {
        await this.app.load();

        if (this.locked) {
            const masterKey = await browser.runtime.sendMessage({ type: "requestMasterKey" });
            if (masterKey) {
                await this.app.unlockWithMasterKey(base64ToBytes(masterKey));
                this._ready = true;
                this._unlocked(true);
            }
        }

        const [tab] = await browser.tabs.query({ active: true });
        const url = tab && tab.url && new URL(tab.url);
        this.app.state.currentHost = (url && url.host) || "";

        if (this.app.state.currentHost && this.app.getItemsForHost(this.app.state.currentHost).length) {
            this.router.go("items", { host: "true" }, true);
        } else {
            try {
                const routerState = await this.app.storage.get(RouterState, "");
                this.router.go(routerState.path, routerState.params, true);
            } catch (e) {}
        }

        this.router.addEventListener("route-changed", () => this._saveRouterState());
        this.router.addEventListener("params-changed", () => this._saveRouterState());

        this.addEventListener("field-clicked", (e: any) => this._fieldClicked(e));
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

        return super.load();
    }

    stateChanged() {
        super.stateChanged();
        notifyStateChanged();
    }

    _unlocked(instant = false) {
        super._unlocked(instant);

        if (!this.state.account || !this.state.account.masterKey) {
            return;
        }
        browser.runtime.sendMessage({
            type: "unlocked",
            masterKey: bytesToBase64(this.state.account.masterKey)
        });

        if (this.app.state.currentHost && this.app.getItemsForHost(this.app.state.currentHost).length) {
            this.router.go("items", { host: "true" }, true);
        }
    }

    _locked() {
        super._locked();
        browser.runtime.sendMessage({
            type: "locked"
        });
    }

    _loggedIn() {
        super._loggedIn();
        browser.runtime.sendMessage({
            type: "loggedIn"
        });
    }

    _loggedOut() {
        super._loggedOut();
        browser.runtime.sendMessage({
            type: "loggedOut"
        });
    }

    private async _saveRouterState() {
        const { host, ...params } = this.router.params;
        await this.app.storage.save(new RouterState({ path: this.router.path, params }));
    }

    private async _fieldClicked({ detail: { item, index } }: CustomEvent<{ item: VaultItem; index: number }>) {
        const field = item.fields[index];
        const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
        const filled = await messageTab({
            type: "fillActive",
            value
        });

        if (filled) {
            window.close();
        }
    }

    private async _fieldDragged({
        detail: { item, index, event }
    }: CustomEvent<{ item: VaultItem; index: number; event: DragEvent }>) {
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

        document.addEventListener("dragleave", dragleave, { once: true });
        event.target!.addEventListener("dragend", dragend, { once: true });

        const field = item.fields[index];
        const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;

        await messageTab({
            type: "fillOnDrop",
            value
        });
    }
}

customElements.define("pl-extension-app", ExtensionApp);
