import "../../assets/fonts/fonts.css";
import { Plan, PlanType } from "@padloc/core/src/billing";
import { translate as $l } from "@padloc/locale/src/translate";
import { biometricAuth } from "@padloc/core/src/platform";
import { config, shared, mixins } from "../styles";
import { app, router } from "../globals";
import { StateMixin } from "../mixins/state";
import { AutoLock } from "../mixins/auto-lock";
import { ErrorHandling } from "../mixins/error-handling";
import { AutoSync } from "../mixins/auto-sync";
import { ServiceWorker } from "../mixins/service-worker";
import { BaseElement, html, css, property, query, listen } from "./base";
import "./icon";
import { Input } from "./input";
import { View } from "./view";
import { ItemsList } from "./items-list";
import { Settings } from "./settings";
import { OrgView } from "./org-view";
import { OrgsList } from "./orgs-list";
import { Start } from "./start";
import { alert, confirm, prompt, clearDialogs, dialog } from "../lib/dialog";
import { Dialog } from "./dialog";
import { clearClipboard } from "../lib/clipboard";
import { Menu } from "./menu";
import { InviteDialog } from "./invite-dialog";
import { ItemDialog } from "./item-dialog";
import { CreateOrgDialog } from "./create-org-dialog";
import { ChoosePlanDialog } from "./choose-plan-dialog";
import { PremiumDialog } from "./premium-dialog";
import { CreateItemDialog } from "./create-item-dialog";
import { TemplateDialog } from "./template-dialog";

// const cordovaReady = new Promise(resolve => {
//     document.addEventListener("deviceready", resolve);
// });

export class App extends ServiceWorker(StateMixin(AutoSync(ErrorHandling(AutoLock(BaseElement))))) {
    @property()
    locked = true;
    @property()
    loggedIn = false;

    @property({ type: Boolean, reflect: true, attribute: "singleton-container" })
    readonly singletonContainer = true;

    get router() {
        return router;
    }

    @property()
    protected _ready = false;

    @query("pl-start")
    private _startView: Start;
    @query("pl-settings")
    private _settings: Settings;
    @query("pl-org-view")
    private _orgView: OrgView;
    @query("pl-items-list")
    private _items: ItemsList;
    @query("pl-orgs-list")
    private _orgs: OrgsList;
    @query("pl-menu")
    private _menu: Menu;

    @dialog("pl-invite-dialog")
    private _inviteDialog: InviteDialog;

    @dialog("pl-item-dialog")
    private _itemDialog: ItemDialog;

    @dialog("pl-choose-plan-dialog")
    private _choosePlanDialog: ChoosePlanDialog;

    @dialog("pl-create-org-dialog")
    private _createOrgDialog: CreateOrgDialog;

    @dialog("pl-premium-dialog")
    private _premiumDialog: PremiumDialog;

    @dialog("pl-create-item-dialog")
    private _createItemDialog: CreateItemDialog;

    @dialog("pl-template-dialog")
    private _templateDialog: TemplateDialog;

    @property()
    private _view: View | null;

    @property({ reflect: true, attribute: "menu-open" })
    private _menuOpen: boolean = false;

    shouldUpdate() {
        return this._ready;
    }

    constructor() {
        super();
        this.load();
    }

    async load() {
        await app.loaded;
        // Try syncing account so user can unlock with new password in case it has changed
        if (app.state.loggedIn) {
            app.fetchAccount();
        }
        this._ready = true;
        this._routeChanged();
        const spinner = document.querySelector(".spinner") as HTMLElement;
        spinner.style.display = "none";
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
                background: linear-gradient(
                    var(--color-gradient-highlight-to) 0%,
                    var(--color-gradient-highlight-from) 100%
                );
                overflow: hidden;
                color: var(--color-foreground);
                position: fixed;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s;
                display: flex;
                flex-direction: column;
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
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
                ${mixins.fullbleed()}
                ${mixins.gradientDark()}
            }

            pl-menu {
                width: var(--menu-width);
            }

            .views {
                flex: 1;
                position: relative;
                margin: var(--gutter-size);
                margin-left: 0;
                background: var(--color-quaternary);
                border-radius: var(--border-radius);
                overflow: hidden;
            }

            .views > * {
                transition: opacity 0.4s;
                border-radius: var(--border-radius);
                ${mixins.fullbleed()}
            }

            .views > :not(.showing) {
                opacity: 0;
                z-index: -1;
                pointer-events: none;
            }

            .wrapper:not(.active),
            :host(.dialog-open) .wrapper {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
                border-radius: var(--border-radius);
            }

            :host(.dialog-open.hide-app) {
                background: transparent;
            }

            :host(.dialog-open.hide-app) .main > * {
                opacity: 0;
            }

            .offline {
                background: var(--color-negative);
                color: var(--color-tertiary);
                padding: 8px;
                text-align: center;
                z-index: 100;
                font-weight: 600;
                font-size: var(--font-size-small);
                position: relative;
            }

            .offline pl-icon {
                position: absolute;
                right: 0;
                bottom: 0;
                font-size: var(--font-size-micro);
                margin: 4px;
                width: 30px;
                height: 30px;
            }

            .menu-scrim {
                ${mixins.fullbleed()}
                z-index: 10;
                background: var(--color-tertiary);
                opacity: 0.3;
                transition: opacity 0.3s;
                display: none;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .offline {
                    padding-top: max(calc(env(safe-area-inset-top) - 8px), 8px);
                    margin-bottom: calc(-1 * max(env(safe-area-inset-top), 8px) + 8px);
                }
            }

            @media (max-width: 700px) {
                .views {
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                    ${mixins.fullbleed()}
                }

                .views {
                    margin: 0;
                }

                .views,
                .views > * {
                    border-radius: 0;
                }

                :host([menu-open]) .views {
                    transform: translate(var(--menu-width), 0);
                }

                pl-menu {
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                }

                .menu-scrim {
                    display: block;
                }

                :host(:not([menu-open])) .menu-scrim {
                    opacity: 0;
                    pointer-events: none;
                }

                :host(:not([menu-open])) pl-menu {
                    opacity: 0;
                    transform: translate(-100px, 0);
                }
            }

            @media (min-width: 1200px) {
                .wrapper {
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: rgba(0, 0, 0, 0.5) 0 1px 3px;
                    margin: auto;
                    overflow: hidden;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    bottom: 20px;
                    max-width: 1200px;
                    max-height: 900px;
                }
            }
        `
    ];

    render() {
        return html`
            <div class="offline" ?hidden=${app.online}>
                ${$l("o f f l i n e")}

                <pl-icon icon="info" class="tap" @click=${this._showOfflineAlert}></pl-icon>
            </div>

            <div class="main">
                <pl-start id="startView"></pl-start>

                <div class="wrapper">
                    <pl-menu></pl-menu>

                    <div class="views">
                        <pl-settings></pl-settings>

                        <pl-org-view></pl-org-view>

                        <pl-orgs-list></pl-orgs-list>

                        <pl-items-list></pl-items-list>

                        <div
                            class="menu-scrim showing"
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
    }

    protected _locked() {
        this.$(".wrapper").classList.remove("active");
        clearDialogs();
        clearClipboard();
        this._routeChanged();
    }

    protected _unlocked(instant = false) {
        setTimeout(
            async () => {
                if (!this.$(".wrapper")) {
                    await this.updateComplete;
                }

                this.$(".wrapper").classList.add("active");
                if (typeof router.params.next !== "undefined") {
                    router.go(router.params.next, {}, true);
                }
            },
            instant ? 0 : 600
        );
    }

    protected _loggedIn() {}
    protected _loggedOut() {}

    @listen("toggle-menu")
    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    _closeMenu(e: MouseEvent) {
        this._menuOpen = false;
        e.preventDefault();
    }

    @listen("dialog-open")
    _dialogOpen(e: CustomEvent) {
        const dialog = e.target as Dialog<any, any>;
        this.classList.add("dialog-open");
        if (dialog.hideApp) {
            this.classList.add("hide-app");
        }
    }

    @listen("dialog-close")
    _dialogClose() {
        this.classList.remove("dialog-open");
        this.classList.remove("hide-app");
    }

    @listen("route-changed", router)
    async _routeChanged() {
        if (!this._ready) {
            return;
        }

        Dialog.closeAll();

        await app.loaded;

        const path = router.path;

        let match;

        if (path === "recover") {
            this._startView.recover();
            return;
        }

        if (!app.account) {
            if (path === "login") {
                this._startView.login();
            } else if ((match = path.match(/^signup(?:\/([^\/]+))?$/))) {
                const [, step] = match;
                this._startView.signup(step);
            } else {
                const params = router.params;

                if (path) {
                    params.next = path;
                }

                if ((match = path.match(/^invite\/([^\/]+)\/([^\/]+)$/))) {
                    const [, org, id] = match;
                    params.invite = org + "," + id;
                }

                router.go(params.verify ? "signup" : "login", params, true);
            }
            return;
        }

        if (this.state.locked) {
            if (path === "unlock") {
                this._startView.unlock();
            } else {
                router.go("unlock", path ? { next: path, nobio: "1" } : undefined, true);
            }
            return;
        }

        if (path === "settings") {
            this._openView(this._settings);
            this._menu.selected = "settings";
        } else if ((match = path.match(/^orgs?(?:\/([^\/]+))?$/))) {
            const [, id] = match;
            const org = id && app.getOrg(id);
            if (id && !org) {
                router.go("orgs", undefined, true);
                return;
            }

            if (org) {
                this._orgView.orgId = id || "";
                this._openView(this._orgView);
                this._menu.selected = `orgs/${id}`;
            } else {
                this._openView(this._orgs);
                this._menu.selected = "orgs";
            }
        } else if ((match = path.match(/^items(?:\/([^\/]+))?$/))) {
            const [, id] = match;

            const { vault, tag, favorites, attachments, recent, host } = router.params;
            this._items.selected = id || "";
            this._items.vault = vault || "";
            this._items.tag = tag || "";
            this._items.favorites = favorites === "true";
            this._items.attachments = attachments === "true";
            this._items.recent = recent === "true";
            this._items.host = host === "true";
            this._openView(this._items);

            this._menu.selected = vault
                ? `vault/${vault}`
                : tag
                ? `tag/${tag}`
                : favorites
                ? "favorites"
                : recent
                ? "recent"
                : attachments
                ? "attachments"
                : host
                ? "host"
                : "items";

            const item = id && app.getItem(id);
            if (item) {
                this._itemDialog.show(item.item.id);
                const { edit, addattachment, ...rest } = router.params;
                if (typeof edit !== "undefined") {
                    this._itemDialog.edit();
                    if (typeof addattachment !== "undefined") {
                        this._itemDialog.addAttachment();
                    }
                    router.params = rest;
                }
                app.updateItem(item.vault, item.item, { lastUsed: new Date() });
            }
        } else if ((match = path.match(/^invite\/([^\/]+)\/([^\/]+)$/))) {
            const [, orgId, id] = match;
            const invite = await app.getInvite(orgId, id);
            const org = app.getOrg(orgId);
            if (invite) {
                if (org && org.isAdmin(app.account!)) {
                    await org.unlock(app.account!);
                    await invite.unlock(org.invitesKey);
                }
                this._inviteDialog.show(invite);
            } else {
                await alert($l("Could not find invite! Did you use the correct link?"), { type: "warning" });
                router.go("items", undefined, true);
            }
        } else if ((match = path.match(/^plans?\/(.+)\/?$/))) {
            const billingProvider = app.state.billingProvider;
            if (!billingProvider) {
                router.go("items", undefined, true);
                return;
            }

            const planType = parseInt(match[1]);
            if (planType === PlanType.Premium) {
                await this._premiumDialog.show();
                router.go("items", undefined, true);
            } else {
                const plan = billingProvider!.plans.find(p => p.type === planType);
                if (plan && plan.type !== PlanType.Free) {
                    const org = await this._createOrgDialog.show(plan);
                    if (org) {
                        router.go(`orgs/${org.id}`);
                    } else {
                        router.go("items", undefined, true);
                    }
                } else {
                    router.go("items", undefined, true);
                }
            }
        } else {
            router.go("items", undefined, true);
        }
    }

    private async _openView(view: View | null) {
        if (view === this._view) {
            return;
        }

        if (view) {
            // const backward = direction === "backward" && this._view;
            // animateElement(view, {
            //     animation: backward ? "viewOut" : "viewIn",
            //     duration: 400,
            //     easing: "cubic-bezier(0.6, 0, 0.2, 1)",
            //     fill: "backwards",
            //     direction: backward ? "reverse" : "normal"
            // });
            view.classList.add("showing");
            view.active = true;
        }

        if (this._view) {
            // const backward = direction === "backward" || !view;
            // animateElement(this._view, {
            //     animation: backward ? "viewIn" : "viewOut",
            //     duration: 400,
            //     easing: "cubic-bezier(0.6, 0, 0.2, 1)",
            //     fill: "forwards",
            //     direction: backward ? "reverse" : "normal"
            // });
            // await wait(350);
            this._view.classList.remove("showing");
            this._view.active = false;
        }

        this._view = view;
    }

    @listen("keydown", document)
    _keydown(event: KeyboardEvent) {
        if (this.state.locked || Input.activeInput) {
            return;
        }

        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            if (Dialog.openDialogs.size) {
                Dialog.closeAll();
            }
        }
        // CTRL/CMD + F -> Filter
        else if (control && event.key === "f") {
            router.go("items");
            shortcut = () => this._items.search();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        }
    }

    @listen("backbutton", document)
    _androidBack() {
        if (!this.locked && router.canGoBack) {
            router.back();
        } else {
            navigator.Backbutton && navigator.Backbutton.goBack();
        }
    }

    @listen("create-item")
    async _newItem() {
        const template = await this._templateDialog.show();
        if (template) {
            const item = await this._createItemDialog.show(template);
            if (item) {
                const params = { ...router.params, edit: "true" } as any;
                if (template.attachment) {
                    params.addattachment = "true";
                }
                router.go(`items/${item.id}`, params);
            }
        }
    }

    @listen("create-org")
    async _createOrg() {
        let plan: Plan | null = null;

        if (app.billingEnabled) {
            plan = await this._choosePlanDialog.show();
            if (!plan) {
                return;
            }
        }

        const org = await this._createOrgDialog.show(plan);
        if (org) {
            router.go(`orgs/${org.id}`);
        }
    }

    @listen("get-premium")
    async _getPremium(e: CustomEvent) {
        const message = e.detail && (e.detail.message as string);
        const icon = (e.detail && e.detail.icon) || "error";

        const confirmed = !message || (await confirm(message, $l("Get Premium"), $l("Cancel"), { icon }));

        if (confirmed) {
            await this._premiumDialog.show();
        }

        this._routeChanged();
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

    @listen("enable-biometric-auth")
    async _enableBiometricAuth(e: CustomEvent) {
        const confirmed = await confirm(
            (e.detail && e.detail.message) || $l("Do you want to enable biometric unlock for this device?"),
            $l("Setup"),
            $l("Cancel"),
            {
                title: $l("Biometric Unlock")
            }
        );

        if (!confirmed) {
            app.forgetMasterKey();
            return;
        }

        try {
            const authenticated = await biometricAuth();

            if (!authenticated) {
                alert($l("Biometric authentication failed! Canceling Setup."), {
                    title: $l("Setup Failed"),
                    type: "warning"
                });
                app.forgetMasterKey();
                return;
            }
        } catch (e) {
            alert($l("Biometric unlock failed! Canceling Setup. (Reason: {0})", e.message), {
                title: $l("Setup Failed"),
                type: "warning"
            });
            app.forgetMasterKey();
            return;
        }

        if (app.account!.locked) {
            const password = await prompt($l("Please enter your master password!"), {
                title: $l("Biometric Unlock"),
                label: $l("Enter Master Password"),
                type: "password",
                validate: async pwd => {
                    try {
                        await app.account!.unlock(pwd);
                    } catch (e) {
                        throw $l("Wrong password! Please try again!");
                    }

                    return pwd;
                }
            });

            if (!password) {
                app.forgetMasterKey();
                return;
            }

            await app.unlock(password);
        }

        await app.rememberMasterKey();

        await alert($l("Biometric unlock activated successfully!"), {
            title: $l("Biometric Unlock"),
            type: "success",
            preventAutoClose: true
        });
    }
}

window.customElements.define("pl-app", App);
