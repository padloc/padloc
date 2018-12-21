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
import { Browse } from "./browse.js";
import { Settings } from "./settings.js";
import { Manage } from "./manage.js";
import { Start } from "./start.js";
import { alert, clearDialogs, dialog } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { Menu } from "./menu.js";
import { InviteDialog } from "./invite-dialog.js";

// const cordovaReady = new Promise(resolve => {
//     document.addEventListener("deviceready", resolve);
// });

class App extends AutoSync(ErrorHandling(AutoLock(BaseElement))) {
    @query("pl-start")
    private _startView: Start;
    @query("pl-browse")
    private _browse: Browse;
    @query("pl-settings")
    private _settings: Settings;
    @query("pl-manage")
    private _manage: Manage;
    @query("pl-menu")
    private _menu: Menu;

    @dialog("pl-invite-dialog")
    private _inviteDialog: InviteDialog;

    @property()
    private _view: View | null;

    @property({ reflect: true, attribute: "menu-open" })
    _menuOpen: boolean = false;

    async connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
        ${config.cssVars}
        ${shared}

        <style>
            :host {
                background: linear-gradient(var(--color-gradient-highlight-to) 0%, var(--color-gradient-highlight-from) 100%);
                overflow: hidden;
                color: var(--color-foreground);
                position: absolute;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s backwards 0.2s;
                perspective: 1000px;
            }

            .wrapper {
                ${mixins.fullbleed()}
                ${mixins.gradientDark()}
                display: flex;
                transform: translate3d(0, 0, 0);
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
                will-change: transform, opacity;
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
                ${mixins.fullbleed()}
                will-change: opacity;
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
                :host {
                    background: #222;
                    box-shadow: inset #000 0 0 1000px;
                }

                .wrapper {
                    background: transparent;
                }

                .views {
                    ${mixins.fullbleed()}
                    margin: 0;
                    transition: transform 0.3s cubic-bezier(0.6, 0, 0.2, 1);
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

                <pl-browse ?showing=${this._view === this._browse}></pl-browse>

                <pl-manage ?showing=${this._view === this._manage}></pl-manage>

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
    }

    @listen("unlock", app)
    _unlocked() {
        setTimeout(() => {
            this.$(".wrapper").classList.add("active");
            this._applyPath(router.path);
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
        if (!app.locked) {
            this._applyPath(path, direction);
        }
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
        if (path === "settings") {
            this._openView(this._settings);
            this._menu.selected = "settings";
        } else if ((match = path.match(/^vaults(?:\/([^\/]+))?$/))) {
            const [, id] = match;
            if (id && !app.getVault(id)) {
                router.go("vaults");
                return;
            }
            this._manage.selected = id || "";
            this._openView(this._manage);
            this._menu.selected = "vaults";
        } else if ((match = path.match(/^items(?:\/([^\/]+))?$/))) {
            const [, id] = match;
            if (id && !app.getItem(id)) {
                router.go("items");
                return;
            }
            this._browse.selected = id || "";
            this._openView(this._browse);
            this._menu.selected = "items";
        } else if ((match = path.match(/^invite\/([^\/]+)\/([^\/]+)$/))) {
            const [, vault, id] = match;
            const invite = await app.getInvite(vault, id);
            if (invite) {
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
            shortcut = () => this._browse.search();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        } else if (!control && event.key.length === 1) {
            this._browse.search();
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
