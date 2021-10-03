import { css, html, LitElement } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { translate as $l } from "@padloc/locale/src/translate";
import { VaultItem } from "@padloc/core/src/item";
import { config, shared, mixins } from "../styles";
import { app, router } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { AutoLock } from "../mixins/auto-lock";
import { ErrorHandling } from "../mixins/error-handling";
import { AutoSync } from "../mixins/auto-sync";
import { ServiceWorker } from "../mixins/service-worker";
import { alert, confirm, prompt, clearDialogs, dialog } from "../lib/dialog";
import { Dialog } from "./dialog";
import { clearClipboard } from "../lib/clipboard";
import { CreateOrgDialog } from "./create-org-dialog";
import { CreateItemDialog } from "./create-item-dialog";
import { TOTPElement } from "./totp";
import "./icon";
import "./start";
import "./items";
import "./org-view";
import "./settings";
import "./invite-recipient";
import "./menu";
import { registerPlatformAuthenticator, supportsPlatformAuthenticator } from "@padloc/core/src/platform";
import { AuthPurpose } from "@padloc/core/src/auth";
import { ProvisioningStatus } from "@padloc/core/src/provisioning";
import "./markdown-content";
import { displayProvisioning } from "../lib/provisioning";

@customElement("pl-app")
export class App extends ServiceWorker(StateMixin(AutoSync(ErrorHandling(AutoLock(Routing(LitElement)))))) {
    @property({ type: Boolean })
    locked = true;

    @property({ type: Boolean })
    loggedIn = false;

    @property({ attribute: false })
    readonly routePattern = /^([^\/]*)(?:\/([^\/]+))?/;

    @property({ type: Boolean, reflect: true, attribute: "singleton-container" })
    readonly singletonContainer = true;

    @state()
    protected _ready = false;

    @dialog("pl-create-org-dialog")
    private _createOrgDialog: CreateOrgDialog;

    @dialog("pl-create-item-dialog")
    private _createItemDialog: CreateItemDialog;

    private _pages = ["start", "unlock", "login", "signup", "recover", "items", "settings", "orgs", "invite"];

    @state()
    private _page: string = "start";

    @state()
    private _menuOpen: boolean = false;

    @query(".wrapper")
    private _wrapper: HTMLDivElement;

    constructor() {
        super();
        this.load();
    }

    async load() {
        await app.load();
        // Try syncing account so user can unlock with new password in case it has changed
        if (app.state.loggedIn) {
            app.fetchAccount();
        }
        this._ready = true;
        // this.routeChanged();
        const spinner = document.querySelector(".spinner") as HTMLElement;
        spinner.style.display = "none";
    }

    async handleRoute([page]: [string, string], { next, ...params }: { next?: string }, path: string) {
        if (page === "oauth") {
            window.opener?.postMessage({ type: "padloc_oauth_redirect", url: window.location.toString() }, "*");
            return;
        }

        await app.loaded;

        const provisioning = app.getAccountProvisioning();

        if (!app.state.loggedIn) {
            if (!["start", "login", "signup", "recover"].includes(page)) {
                this.go("start", { next: path || undefined, ...params }, true);
                return;
            }
        } else if (app.state.locked) {
            if (!["unlock", "recover"].includes(page)) {
                this.go("unlock", { next: next || path || undefined, ...params }, true);
                return;
            }
        } else if (
            provisioning &&
            [ProvisioningStatus.Unprovisioned, ProvisioningStatus.Suspended].includes(provisioning?.status)
        ) {
            await displayProvisioning(provisioning);
            this.redirect("");
            return;
        } else if (next && !["start", "login", "unlock", "signup", "recover"].includes(next)) {
            this.go(next, { next: undefined, ...params }, true);
            return;
        }

        if (!page || !this._pages.includes(page)) {
            this.redirect("items");
            return;
        }

        this._page = page;
    }

    static styles = [
        config.cssVars,
        shared,
        css`
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
            }

            :host {
                background: var(--color-background);
                overflow: hidden;
                color: var(--color-foreground);
                position: fixed;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s;
                display: flex;
                flex-direction: column;
                background: var(--blue-gradient);
                --menu-width: 250px;
            }

            .main {
                flex: 1;
                position: relative;
                perspective: 1000px;
            }

            .wrapper {
                display: flex;
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1), filter 0.4s;
                ${mixins.fullbleed()};
                background: var(--color-background);
            }

            pl-menu {
                width: var(--menu-width);
                padding-bottom: max(calc(env(safe-area-inset-bottom, 0) - 1.5em), 0em);
            }

            .views {
                flex: 1;
                position: relative;
                overflow: hidden;
            }

            .views > * {
                ${mixins.fullbleed()};
                top: max(calc(env(safe-area-inset-top, 0) - 1em), 0em);
            }

            .wrapper:not(.active),
            :host(.dialog-open) .wrapper {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
                border-radius: 1em;
            }

            :host(.dialog-open.hide-app) {
                background: transparent;
            }

            :host(.dialog-open.hide-app) .main > * {
                opacity: 0;
            }

            .offline-indicator {
                background: var(--color-negative);
                color: var(--color-white);
                padding: var(--spacing);
                text-align: center;
                z-index: 100;
                font-weight: 600;
                font-size: var(--font-size-small);
                position: relative;
                padding-top: max(env(safe-area-inset-top, 0), 0.5em);
                margin-bottom: min(calc(-1 * env(safe-area-inset-top, 0) + 1em), 0em);
            }

            .offline-indicator pl-button {
                position: absolute;
                right: 0.2em;
                bottom: 0.15em;
                font-size: var(--font-size-small);
            }

            .menu-scrim {
                ${mixins.fullbleed()};
                z-index: 10;
                background: var(--color-white);
                opacity: 0.3;
                transition: opacity 0.3s;
                display: none;
            }

            @media (max-width: 1000px) {
                .views {
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                    ${mixins.fullbleed()};
                }

                .views {
                    margin: 0;
                }

                .views,
                .views > * {
                    border-radius: 0;
                }

                :host(.menu-open) .views {
                    transform: translate(var(--menu-width), 0);
                }

                pl-menu {
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                }

                .menu-scrim {
                    display: block;
                }

                :host(:not(.menu-open)) .menu-scrim {
                    opacity: 0;
                    pointer-events: none;
                }

                :host(:not(.menu-open)) pl-menu {
                    opacity: 0;
                    transform: translate(-100px, 0);
                }
            }

            @media (min-width: 1200px) {
                .wrapper {
                    border-radius: 1em;
                    overflow: hidden;
                    box-shadow: rgba(0, 0, 0, 0.2) 0 0 20px;
                    margin: auto;
                    overflow: hidden;
                    top: 2em;
                    left: 2em;
                    right: 2em;
                    bottom: 2em;
                    max-width: 1200px;
                    max-height: 900px;
                }

                .wrapper:not(.active),
                :host(.dialog-open) .wrapper {
                    filter: blur(2px);
                }
            }
        `,
    ];

    render() {
        const provisioning = app.getAccountProvisioning();
        return html`
            ${app.offline
                ? html`
                      <div class="offline-indicator">
                          ${$l("o f f l i n e")}

                          <pl-button class="transparent slim" @click=${this._showOfflineAlert}>
                              <pl-icon icon="info"></pl-icon>
                          </pl-button>
                      </div>
                  `
                : provisioning?.status === ProvisioningStatus.Frozen
                ? html`
                      <div class="offline-indicator">
                          ${$l("Account Frozen")}

                          <pl-button class="transparent slim" @click=${() => displayProvisioning(provisioning)}>
                              <pl-icon icon="info"></pl-icon>
                          </pl-button>
                      </div>
                  `
                : ""}

            <div class="main">
                <pl-start id="startView" active></pl-start>

                <div class="wrapper">
                    <pl-menu></pl-menu>

                    <div class="views">
                        <pl-settings ?hidden=${this._page !== "settings"}></pl-settings>

                        <pl-org-view ?hidden=${this._page !== "orgs"}></pl-org-view>

                        <pl-items ?hidden=${this._page !== "items"}></pl-items>

                        <pl-invite-recipient ?hidden=${this._page !== "invite"}></pl-invite-recipient>

                        <div
                            class="menu-scrim"
                            @touchstart=${(e: MouseEvent) => this._closeMenu(e)}
                            @click=${(e: MouseEvent) => this._closeMenu(e)}
                        ></div>
                    </div>
                </div>

                <slot></slot>
            </div>
        `;
    }

    stateChanged() {
        this.locked = this.state.locked;
        this.loggedIn = this.state.loggedIn;
        super.stateChanged();
    }

    updated(changes: Map<string, any>) {
        if (changes.has("locked")) {
            if (this.locked) {
                this._locked();
            } else {
                this._unlocked();
            }
        }

        if (changes.has("loggedIn")) {
            if (this.loggedIn) {
                this._loggedIn();
            } else {
                this._loggedOut();
            }
        }

        if (changes.has("_menuOpen")) {
            this.classList.toggle("menu-open", this._menuOpen);
        }

        this.classList.toggle("theme-dark", app.settings.theme === "dark");
        this.classList.toggle("theme-light", app.settings.theme === "light");
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("toggle-menu", () => this._toggleMenu());
        this.addEventListener("dialog-open", (e: any) => this._dialogOpen(e));
        this.addEventListener("dialog-close", () => this._dialogClose());
        this.addEventListener("create-item", () => this._newItem());
        this.addEventListener("create-org", () => this._createOrg());
        this.addEventListener("field-dragged", (e: any) => this._fieldDragged(e));
        window.addEventListener("backbutton", () => this._androidBack());
        this.addEventListener("enable-biometric-auth", (e: any) => this._enableBiometricAuth(e));
    }

    protected _locked() {
        this._wrapper.classList.remove("active");
        clearDialogs();
        clearClipboard();
    }

    protected _unlocked(instant = false) {
        setTimeout(
            async () => {
                if (!this._wrapper) {
                    await this.updateComplete;
                }

                this._wrapper.classList.add("active");
            },
            instant ? 0 : 600
        );
    }

    protected _loggedIn() {}
    protected _loggedOut() {}

    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    _closeMenu(e: MouseEvent) {
        this._menuOpen = false;
        e.preventDefault();
    }

    _dialogOpen(e: CustomEvent) {
        const dialog = e.target as Dialog<any, any>;
        this.classList.add("dialog-open");
        if (dialog.hideApp) {
            this.classList.add("hide-app");
        }
    }

    _dialogClose() {
        this.classList.remove("dialog-open");
        this.classList.remove("hide-app");
    }

    // @listen("keydown", document)
    // _keydown(event: KeyboardEvent) {
    //     if (this.state.locked || Input.activeInput) {
    //         return;
    //     }
    //
    //     const control = event.ctrlKey || event.metaKey;
    //
    //     // ESCAPE -> Back
    //     if (event.key === "Escape") {
    //         if (Dialog.openDialogs.size) {
    //             Dialog.closeAll();
    //         }
    //     }
    //     // CTRL/CMD (+ Shift) + F -> Search (All)
    //     else if (control && event.key === "f") {
    //         event.preventDefault();
    //         const { vault, tags, recent, favorites, attachments, ...rest } = router.params;
    //         router.go("items", event.shiftKey ? rest : { vault, tags, recent, favorites, attachments, ...rest });
    //         this._items.search();
    //     }
    // }

    _androidBack() {
        if (!this.locked && router.canGoBack) {
            router.back();
        } else {
            navigator.Backbutton && navigator.Backbutton.goBack();
        }
    }

    async _newItem() {
        const vault = (router.params.vault && app.getVault(router.params.vault)) || undefined;
        await this._createItemDialog.show(vault);
    }

    async _createOrg() {
        const org = await this._createOrgDialog.show();
        if (org) {
            router.go(`orgs/${org.id}`);
        }
    }

    private _showOfflineAlert() {
        alert(
            $l(
                "It looks like the app cannot connect to the Padloc servers right now, probably due " +
                    "to a missing internet connection. You can still access your vaults and even create " +
                    "or edit Vault Items but your changes won't be synchronized until you're back online."
            ),
            { title: $l("You're Offline") }
        );
    }

    async _enableBiometricAuth(e: CustomEvent) {
        if (!supportsPlatformAuthenticator()) {
            await alert($l("Biometric unlock is not supported on this device."), { title: $l("Device Not Supported") });
            return;
        }

        const confirmed = await confirm(
            (e.detail && e.detail.message) || $l("Do you want to enable biometric unlock for this device?"),
            $l("Setup"),
            $l("Cancel"),
            {
                title: $l("Biometric Unlock"),
                icon: "fingerprint",
            }
        );

        if (!confirmed) {
            app.forgetMasterKey();
            return;
        }

        let authenticatorId: string | undefined = undefined;

        try {
            authenticatorId = await registerPlatformAuthenticator([AuthPurpose.AccessKeyStore]);
        } catch (e: any) {
            alert(
                $l(
                    "Biometric authentication failed! Canceling Setup. (Reason: {0})",
                    typeof e === "string" ? e : e.message
                ),
                {
                    title: $l("Setup Failed"),
                    type: "warning",
                }
            );
            app.forgetMasterKey();
            return;
        }

        if (app.account!.locked) {
            const password = await prompt($l("Please enter your master password!"), {
                title: $l("Biometric Unlock"),
                label: $l("Enter Master Password"),
                type: "password",
                validate: async (pwd) => {
                    try {
                        await app.account!.unlock(pwd);
                    } catch (e) {
                        throw $l("Wrong password! Please try again!");
                    }

                    return pwd;
                },
            });

            if (!password) {
                app.forgetMasterKey();
                return;
            }

            await app.unlock(password);
        }

        await app.rememberMasterKey(authenticatorId);

        await alert($l("Biometric unlock activated successfully!"), {
            title: $l("Biometric Unlock"),
            type: "success",
            preventAutoClose: true,
        });
    }

    protected async _fieldDragged({
        detail: { event, item, index },
    }: CustomEvent<{ item: VaultItem; index: number; event: DragEvent }>) {
        const field = item.fields[index];
        const target = event.target as HTMLElement;
        target.classList.add("dragging");
        target.addEventListener("dragend", () => target.classList.remove("dragging"), { once: true });
        const totp: TOTPElement | null = (target.querySelector("pl-totp") ||
            (target.shadowRoot && target.shadowRoot.querySelector("pl-totp"))) as TOTPElement | null;
        event.dataTransfer!.setData("text/plain", field.type === "totp" && totp ? totp.token : field.value);
    }
}
