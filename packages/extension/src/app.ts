import { authenticate, getPlatformAuthType } from "@padloc/core/src/platform";
import { AuthPurpose } from "@padloc/core/src/auth";
import { alert } from "@padloc/app/src/lib/dialog";
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
    private _handoffToken = new URLSearchParams(window.location.search).get("handoff");
    private _handoffLoaded = false;
    private _handoffRunning = false;
    private _handoffStarting = false;

    private get _usesFirefoxHandoff() {
        return (
            process.env.PL_EXTENSION_BROWSER === "firefox" &&
            new URLSearchParams(window.location.search).get("biometric") !== "1"
        );
    }

    async _enableBiometricAuth(event: CustomEvent) {
        if (this._usesFirefoxHandoff) {
            await browser.tabs.create({ url: browser.runtime.getURL("popup.html?biometric=1&setupBiometric=1") });
            window.close();
            return;
        }
        await super._enableBiometricAuth(event);
    }

    private async _startBiometricHandoff() {
        if (this._handoffStarting) return;
        this._handoffStarting = true;
        try {
            if (!this.app.state.rememberedMasterKey) {
                await this._enableBiometricAuth(new CustomEvent("enable-biometric-auth"));
                return;
            }
            const current = await browser.windows.getCurrent();
            const started = await browser.runtime.sendMessage({ type: "startBiometricHandoff", windowId: current.id });
            if (started) window.close();
            else throw new Error("Biometric unlock is not available. Enable it in Settings > Security first.");
        } catch (error) {
            await alert(error.message || "Could not start biometric unlock.", {
                title: "Biometric Unlock",
                type: "warning",
            });
        } finally {
            this._handoffStarting = false;
        }
    }

    private _beforeBiometricAuth = (event: Event) => {
        if (this._handoffToken) {
            event.preventDefault();
            if (this._handoffLoaded) void this._authenticateHandoff();
        } else if (this._usesFirefoxHandoff) {
            event.preventDefault();
            // Do not open a new window merely because the popup reset its form.
            if ((event as CustomEvent<{ userInitiated: boolean }>).detail?.userInitiated)
                void this._startBiometricHandoff();
        }
    };

    private _abortHandoff() {
        if (!this._handoffToken) return;
        // The background closes this page, so channel teardown is expected.
        void browser.runtime
            .sendMessage({ type: "abortBiometricHandoff", token: this._handoffToken })
            .then((reopened) => {
                if (!reopened) window.close();
            })
            .catch(() => window.close());
    }

    private async _authenticateHandoff() {
        if (!this._handoffToken || this._handoffRunning) return;
        this._handoffRunning = true;
        const epoch = this._unlockEpoch;
        try {
            if (!this.app.state.locked || !this.app.state.rememberedMasterKey) {
                throw new Error(
                    "Enable biometric unlock in Settings > Security first, then try again from the toolbar popup."
                );
            }
            const focused = await browser.runtime.sendMessage({
                type: "focusBiometricHandoff",
                token: this._handoffToken,
            });
            if (!focused) throw new Error("This unlock attempt expired or was canceled.");
            // The OS must see a focused document; a hidden/background WebAuthn
            // request is not a supported way around Firefox's popup lifecycle.
            if (!document.hasFocus()) {
                await new Promise<void>((resolve, reject) => {
                    const cleanup = () => window.removeEventListener("focus", onFocus);
                    const timer = window.setTimeout(() => {
                        cleanup();
                        reject(new Error("Focus this window and try again."));
                    }, 5000);
                    const onFocus = () => {
                        cleanup();
                        window.clearTimeout(timer);
                        resolve();
                    };
                    window.addEventListener("focus", onFocus);
                    if (document.hasFocus()) onFocus();
                });
            }
            const { token } = await authenticate({
                purpose: AuthPurpose.AccessKeyStore,
                type: getPlatformAuthType()!,
                authenticatorId: this.app.state.rememberedMasterKey.authenticatorId,
            });
            const valid = await browser.runtime.sendMessage({
                type: "validateBiometricHandoff",
                token: this._handoffToken,
            });
            if (!valid || epoch !== this._unlockEpoch) throw new Error("This unlock attempt expired or was canceled.");
            await this.app.unlockWithRememberedMasterKey(token);
        } catch {
            this._abortHandoff();
        } finally {
            this._handoffRunning = false;
        }
    }

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
        this.addEventListener("before-biometric-auth", this._beforeBiometricAuth);
        browser.runtime.onMessage.addListener(this._onMessage);
        document.addEventListener("click", this._activity);
        document.addEventListener("keydown", this._activity);
        document.addEventListener("visibilitychange", this._visibilityChanged);
        super.connectedCallback();
    }

    disconnectedCallback() {
        this.removeEventListener("before-biometric-auth", this._beforeBiometricAuth);
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

        if (!this.app.state.locked && routerState.path === "unlock") {
            // A helper can finish authentication without going through the
            // unlock view's navigation. Never restore a stale lock screen over
            // an account whose session key was already restored successfully.
            const { next, ...params } = routerState.params;
            this.router.go(next || "items", params, true);
            await this._saveRouterState();
        } else if (
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

        if (this._handoffToken) {
            this._handoffLoaded = true;
            void this._authenticateHandoff();
        } else if (new URLSearchParams(window.location.search).get("setupBiometric") === "1") {
            void this._enableBiometricAuth(new CustomEvent("enable-biometric-auth"));
        }

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
                ...(this._handoffToken ? { handoffToken: this._handoffToken } : {}),
            })) as UnlockResponse | null;
            if (epoch === this._unlockEpoch && unlockState) {
                this._unlockId = unlockState.id;
                if (this._handoffToken) {
                    // Completion closes this very page. Its message channel
                    // may disappear before a reply; that is not an unlock failure.
                    void browser.runtime
                        .sendMessage({
                            type: "completeBiometricHandoff",
                            token: this._handoffToken,
                            unlockId: unlockState.id,
                        })
                        .then((completed) => {
                            if (!completed) this._abortHandoff();
                        })
                        .catch(() => {});
                }
            } else {
                await this._lockPopup();
                if (this._handoffToken) this._abortHandoff();
            }
        } catch (e) {
            await this._lockPopup();
            if (this._handoffToken) this._abortHandoff();
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
