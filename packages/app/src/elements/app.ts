import { localize as $l } from "@padloc/core/lib/locale.js";
import { config, shared, mixins } from "../styles";
import { app, router } from "../init.js";
import { AutoLock } from "../mixins/auto-lock.js";
import { ErrorHandling } from "../mixins/error-handling.js";
import { AutoSync } from "../mixins/auto-sync.js";
import { BaseElement, html, property, query, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { View } from "./view.js";
import { ItemsList } from "./items-list.js";
import { Settings } from "./settings.js";
import { OrgView } from "./org-view.js";
import { Start } from "./start.js";
import { alert, clearDialogs, dialog } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { Menu } from "./menu.js";
import { InviteDialog } from "./invite-dialog.js";
import { ItemDialog } from "./item-dialog.js";

// const cordovaReady = new Promise(resolve => {
//     document.addEventListener("deviceready", resolve);
// });

class App extends AutoSync(ErrorHandling(AutoLock(BaseElement))) {
    @query("pl-start")
    private _startView: Start;
    @query("pl-settings")
    private _settings: Settings;
    @query("pl-org-view")
    private _orgView: OrgView;
    @query("pl-items-list")
    private _items: ItemsList;
    @query("pl-menu")
    private _menu: Menu;

    @dialog("pl-invite-dialog")
    private _inviteDialog: InviteDialog;

    @dialog("pl-item-dialog")
    private _itemDialog: ItemDialog;

    @property()
    private _view: View | null;

    @property({ reflect: true, attribute: "menu-open" })
    _menuOpen: boolean = false;

    async firstUpdated() {
        await app.loaded;
        this._applyPath(router.path);
    }

    render() {
        return html`
            ${config.cssVars} ${shared}

            <style>
                :host {
                    background: linear-gradient(
                        var(--color-gradient-highlight-to) 0%,
                        var(--color-gradient-highlight-from) 100%
                    );
                    overflow: hidden;
                    color: var(--color-foreground);
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    animation: fadeIn 0.5s backwards 0.2s;
                    perspective: 1000px;
                }

                .wrapper {
                    display: flex;
                    transform: translate3d(0, 0, 0);
                    transform-origin: 0 center;
                    transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
                    will-change: transform, opacity;
                    ${mixins.fullbleed()}
                    ${mixins.gradientDark()}
                }

                pl-menu {
                    width: 200px;
                }

                .views {
                    flex: 1;
                    position: relative;
                    perspective: 1000px;
                    margin: var(--gutter-size);
                    margin-left: 0;
                }

                .views > * {
                    will-change: opacity;
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
                }

                @media (max-width: ${config.narrowWidth}px) {
                    .views {
                        transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                        ${mixins.fullbleed()}
                    }

                    .views {
                        margin: 0;
                    }

                    .views > * {
                        border-radius: 0;
                    }

                    :host([menu-open]) .views {
                        transform: translate(200px, 0);
                    }

                    pl-menu {
                        transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1),
                            opacity 0.3s cubic-bezier(0.6, 0, 0.2, 1);
                    }

                    :host(:not([menu-open])) pl-menu {
                        opacity: 0;
                        transform: translate(-100px, 0);
                    }
                }

                @media (min-width: ${config.wideWidth}px) {
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
            </style>

            <pl-start id="startView"></pl-start>

            <div class="wrapper">
                <pl-menu></pl-menu>

                <div class="views">
                    <pl-settings ?showing=${this._view === this._settings}></pl-settings>

                    <pl-org-view ?showing=${this._view === this._orgView}></pl-org-view>

                    <pl-items-list ?showing=${this._view === this._items}></pl-items-list>
                </div>
            </div>
        `;
    }

    @listen("toggle-menu")
    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    @listen("lock", app)
    _locked() {
        this.$(".wrapper").classList.remove("active");
        this._inviteDialog.open = false;
        clearDialogs();
        clearClipboard();
        this._applyPath(router.path);
    }

    @listen("unlock", app)
    _unlocked() {
        setTimeout(() => {
            this.$(".wrapper").classList.add("active");
            router.go(router.params.next || "", {});
        }, 600);
    }

    @listen("focus", window)
    _focused() {
        setTimeout(() => {
            if (app.locked) {
                this._startView.focus();
            }
        }, 100);
    }

    @listen("route-changed", router)
    _routeChanged({ detail: { path, direction } }: { detail: { path: string; direction: string } }) {
        this._applyPath(path, direction);
    }

    @listen("dialog-open")
    _dialogOpen() {
        this.classList.add("dialog-open");
    }

    @listen("dialog-close")
    _dialogClose() {
        this.classList.remove("dialog-open");
    }

    async _applyPath(path: string, _direction: string = "forward") {
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

        if (app.locked) {
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
        } else if ((match = path.match(/^org\/([^\/]+)$/))) {
            const [, id] = match;
            if (id && !app.getOrg(id)) {
                router.go("");
                return;
            }
            this._orgView.orgId = id || "";
            this._openView(this._orgView);
            this._menu.selected = `org/${id}`;
        } else if ((match = path.match(/^items(?:\/([^\/]+))?$/))) {
            const [, id] = match;
            this._items.selected = id || "";
            this._openView(this._items);
            this._menu.selected = "items";

            const item = id && app.getItem(id);
            if (item) {
                const done = this._itemDialog.show(item.item.id);
                const { edit, ...rest } = router.params;
                if (typeof edit !== "undefined") {
                    this._itemDialog.edit();
                    router.params = rest;
                }
                await done;
                router.go("items");
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
                await this._inviteDialog.show(invite);
                if (router.canGoBack) {
                    router.back();
                } else {
                    router.go("items");
                }
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
        if (app.locked || Input.activeInput) {
            return;
        }

        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            shortcut = () => router.go("");
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
        if (!router.back()) {
            navigator.Backbutton && navigator.Backbutton.goBack();
        }
    }
}

window.customElements.define("pl-app", App);
