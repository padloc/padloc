import { browser } from "webextension-polyfill-ts";
import { App } from "@padloc/app/src/elements/app";
import { debounce } from "@padloc/core/src/util";
import { bytesToBase64, base64ToBytes } from "@padloc/core/src/encoding";

const notifyStateChanged = debounce(() => {
    browser.runtime.sendMessage({
        type: "state-changed"
    });
}, 500);

export class ExtensionApp extends App {
    async load() {
        await this.app.load();
        if (this.locked) {
            const masterKey = await browser.runtime.sendMessage({ type: "requestMasterKey" });
            if (masterKey) {
                this.app.unlockWithMasterKey(base64ToBytes(masterKey));
            }
        }
        return super.load();
    }

    stateChanged() {
        super.stateChanged();
        notifyStateChanged();
    }

    _unlocked() {
        super._unlocked();
        if (!this.state.account || !this.state.account.masterKey) {
            return;
        }
        browser.runtime.sendMessage({
            type: "unlocked",
            masterKey: bytesToBase64(this.state.account.masterKey)
        });
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
}

customElements.define("pl-extension-app", ExtensionApp);
