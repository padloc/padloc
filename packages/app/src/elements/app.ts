import { Plan } from "@padloc/core/lib/billing.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { config, shared, mixins } from "../styles";
import { app, router } from "../init.js";
import { StateMixin } from "../mixins/state.js";
import { AutoLock } from "../mixins/auto-lock.js";
import { ErrorHandling } from "../mixins/error-handling.js";
import { AutoSync } from "../mixins/auto-sync.js";
import { ServiceWorker } from "../mixins/service-worker.js";
import { BaseElement, html, css, property, query, listen, observe } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { View } from "./view.js";
import { ItemsList } from "./items-list.js";
import { Settings } from "./settings.js";
import { OrgView } from "./org-view.js";
import { OrgsList } from "./orgs-list.js";
import { Start } from "./start.js";
import { alert, confirm, clearDialogs, dialog } from "../dialog.js";
import { Dialog } from "./dialog.js";
import { clearClipboard } from "../clipboard.js";
import { Menu } from "./menu.js";
import { InviteDialog } from "./invite-dialog.js";
import { ItemDialog } from "./item-dialog.js";
import { CreateOrgDialog } from "./create-org-dialog.js";
import { ChoosePlanDialog } from "./choose-plan-dialog.js";
import { PremiumDialog } from "./premium-dialog.js";
import { CreateItemDialog } from "./create-item-dialog.js";
import { TemplateDialog } from "./template-dialog.js";

// const cordovaReady = new Promise(resolve => {
//     document.addEventListener("deviceready", resolve);
// });

class App extends ServiceWorker(StateMixin(AutoSync(ErrorHandling(AutoLock(BaseElement))))) {
    @property()
    locked = true;
    @property()
    loggedIn = false;

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

    async firstUpdated() {
        await app.loaded;
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
                width: 200px;
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

            .offline {
                background: var(--color-negative);
                color: var(--color-tertiary);
                padding: 8px;
                text-align: center;
                z-index: 100;
                font-weight: 600;
                letter-spacing: 2px;
                font-size: var(--font-size-small);
                position: relative;
            }

            .offline pl-icon {
                position: absolute;
                right: 0;
                font-size: var(--font-size-micro);
                margin: -4px 4px;
                width: 30px;
                height: 30px;
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
                    transform: translate(200px, 0);
                }

                pl-menu {
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.6, 0, 0.2, 1);
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
                ${$l("offline")}

                <pl-icon icon="info" class="tap" @click=${this._showOfflineAlert}></pl-icon>
            </div>

            <div class="main">
                <pl-start id="startView"></pl-start>

                <div class="wrapper">
                    <pl-menu></pl-menu>

                    <div class="views">
                        <pl-settings ?showing=${this._view === this._settings}></pl-settings>

                        <pl-org-view ?showing=${this._view === this._orgView}></pl-org-view>

                        <pl-orgs-list ?showing=${this._view === this._orgs}></pl-orgs-list>

                        <pl-items-list ?showing=${this._view === this._items}></pl-items-list>
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

    @observe("locked")
    _lockedChanged() {
        if (this.locked) {
            this.$(".wrapper").classList.remove("active");
            this._inviteDialog.open = false;
            clearDialogs();
            clearClipboard();
            this._routeChanged();
        } else {
            setTimeout(() => {
                this.$(".wrapper").classList.add("active");
                router.go(router.params.next || "", {});
            }, 600);
        }
    }

    @listen("toggle-menu")
    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    @listen("focus", window)
    _focused() {
        setTimeout(() => {
            if (this.locked) {
                this._startView.focus();
            }
        }, 100);
    }

    @listen("dialog-open")
    _dialogOpen() {
        this.classList.add("dialog-open");
    }

    @listen("dialog-close")
    _dialogClose() {
        this.classList.remove("dialog-open");
    }

    @listen("route-changed", router)
    async _routeChanged() {
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

                router.go(params.verify ? "signup" : "login", params);
            }
            return;
        }

        if (this.state.locked) {
            if (path === "unlock") {
                this._startView.unlock();
            } else {
                router.go("unlock", path ? { next: path } : undefined);
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
                router.go("orgs");
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

            const { vault, tag, favorites, attachments } = router.params;
            this._items.selected = id || "";
            this._items.vault = vault || "";
            this._items.tag = tag || "";
            this._items.favorites = favorites === "true";
            this._items.attachments = attachments === "true";
            this._openView(this._items);

            this._menu.selected = vault
                ? `vault/${vault}`
                : tag
                ? `tag/${tag}`
                : favorites
                ? "favorites"
                : attachments
                ? "attachments"
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
                router.go("items");
            }
        } else {
            router.go("items");
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
            shortcut = () => this._items.search();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        } else if (!control && event.key.length === 1) {
            this._items.search();
        }
    }

    @listen("backbutton", document)
    _androidBack() {
        if (router.canGoBack) {
            router.back();
        } else {
            navigator.Backbutton && navigator.Backbutton.goBack();
        }
    }

    @listen("create-item")
    async _newItem() {
        const template = await this._templateDialog.show();
        const item = await this._createItemDialog.show(template);
        if (item) {
            router.go(`items/${item.id}`, { ...router.params, edit: "", addattachment: "" });
        }
    }

    @listen("create-org")
    async _createOrg() {
        let plan: Plan | null = null;

        if (app.billingConfig) {
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
}

window.customElements.define("pl-app", App);
