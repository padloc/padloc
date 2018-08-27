import { Store } from "@padlock/core/lib/data.js";
import { checkForUpdates, getPlatformName, getDeviceInfo } from "@padlock/core/lib/platform.js";
import { wait } from "@padlock/core/lib/util.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import config from "../styles/config.js";
import sharedStyles from "../styles/shared.js";
import { app, router } from "../init.js";
import { BaseElement, html, property, query, listen } from "./base.js";
import { AccountView } from "./account-view.js";
import "./icon.js";
import { View } from "./view.js";
import { ListView } from "./list-view.js";
import { RecordView } from "./record-view.js";
import { SettingsView } from "./settings-view.js";
import { StartView } from "./start-view.js";
import { StoreView } from "./store-view.js";
import { TitleBar } from "./title-bar.js";
import { Menu } from "./menu.js";
import { Input } from "./input.js";
import { alert, confirm, clearDialogs } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { animateElement } from "../animation.js";

// TODO: auto lock, auto sync, hints, tracking

const cordovaReady = new Promise(resolve => {
    document.addEventListener("deviceready", resolve);
});

class App extends BaseElement {
    @property({ reflect: "show-menu" })
    private _showMenu: boolean = false;
    @property() private _currentStore: Store = app.mainStore;

    @query("#main") private _main: HTMLDivElement;
    @query("pl-title-bar") private _titleBar: TitleBar;
    @query("pl-list-view") private _listView: ListView;
    @query("pl-record-view") private _recordView: RecordView;
    @query("pl-start-view") private _startView: StartView;
    @query("pl-settings-view") private _settingsView: SettingsView;
    @query("pl-account-view") private _accountView: AccountView;
    @query("pl-store-view") private _storeView: StoreView;
    @query("pl-menu") private _menu: Menu;

    private _currentView: View | null;

    async connectedCallback() {
        super.connectedCallback();
        const device = await getDeviceInfo();
        const isIPhoneX = device.model && /iPhone10,3|iPhone10,6/.test(device.model);

        if (isIPhoneX) {
            Object.assign(document.body.style, {
                margin: 0,
                height: "812px",
                position: "relative"
            });
        }

        await cordovaReady;

        // Replace window.open method with the inappbrowser equivalent
        // window.open = cordova.InAppBrowser.open;
        // if (isIPhoneX) {
        //     StatusBar && StatusBar.show();
        // }
        // navigator.splashscreen.hide();

        const platform = await getPlatformName();
        const className = platform.toLowerCase().replace(/ /g, "-");
        if (className) {
            this.classList.add(className);
            this._titleBar.classList.add(className);
        }
    }

    _render() {
        return html`
        ${config}

        <style>
            ${sharedStyles}

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes viewIn {
                from { transform: translate3d(100%, 0, 0) rotateY(-30deg); z-index: 1; }
                to { transform: translate3d(0, 0, 0); z-index: 1; }
            }

            @keyframes viewOut {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(0, 0, -200px) rotateX(10deg); }
            }

            @keyframes menuItemIn {
                to { transform: translate3d(0, 0, 0); }
            }

            @keyframes menuItemOut {
                from { transform: translate3d(0, 0, 0); }
            }

            @keyframes tagIn {
                from { transform: translate3d(0, 100px, 0); opacity: 0; }
            }

            :host {
                --color-gutter: #222;
                --title-bar-height: 30px;
                --menu-width: 250px;
                --menu-icon-width: 40px;
                --main-padding: 0px;
                overflow: hidden;
                color: var(--color-foreground);
                background: var(--color-gutter);
                position: absolute;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s backwards 0.2s;
                perspective: 1000px;
            }

            :host(:not(.ios):not(.android)) {
                --main-padding: var(--gutter-width);
            }

            :host(.windows) {
                --title-bar-height: 40px;
            }

            :host(.ios), :host(.android) {
                --color-gutter: black;
            }

            #main {
                @apply --fullbleed;
                display: flex;
                overflow: hidden;
                perspective: 1000px;
                top: var(--main-padding);
                left: calc(var(--main-padding) + var(--menu-icon-width));
                right: var(--main-padding);
                bottom: var(--main-padding);
            }

            :host(.macos) #main, :host(.windows) #main, :host(.linux) #main {
                top: var(--title-bar-height) !important;
            }

            :host(.ios) #main {
                top: constant(safe-area-inset-top);
                top: env(safe-area-inset-top);
            }

            #main, pl-list-view {
                transform: translate3d(0, 0, 0);
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
            }

            #main:not(.active),
            :host(.dialog-open) #main {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
            }

            :host([show-menu]) #main {
                transform: translate3d(calc(var(--menu-width) - var(--menu-icon-width)), 0, 0) rotateY(-5deg);
            }

            :host(:not(.macos):not(.windows):not(.linux)) pl-title-bar {
                display: none;
            }

            pl-list-view {
                flex: 1;
                overflow: hidden;
            }

            #views {
                position: relative;
                flex: 1.62; /* Golden Ratio ;) */
                margin-left: var(--gutter-width);
                pointer-events: none;
                perspective: 1000px;
            }

            #views > * {
                transform: translate3d(0, 0, 0);
                overflow: hidden;
            }

            #views > *.showing {
                pointer-events: auto;
            }

            #views > *:not(.showing) {
                opacity: 0;
            }

            #placeholderView {
                @apply --fullbleed;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }

            .placeholder-icon {
                display: block;
                font-size: 120px;
                width: 150px;
                color: var(--color-foreground);
                opacity: 0.5;
            }

            @media (max-width: 900px) {
                #views {
                    flex: 1;
                }
            }

            @media (max-width: 700px) {
                :host {
                    --menu-icon-width: 0px;
                }

                .showing-views pl-list-view {
                    transform: translate3d(0, 0, -150px) rotateX(10deg);
                }

                #views {
                    @apply --fullbleed;
                    box-shadow: none;
                    z-index: 1;
                    margin-left: 0;
                    overflow: visible;
                }

                #placeholderView {
                    display: none;
                }
            }
        </style>

        <pl-start-view id="startView"></pl-start-view>

        <pl-menu
            on-menu-open="${() => (this._showMenu = true)}"
            on-menu-close="${() => (this._showMenu = false)}"
            on-select-tag="${(e: CustomEvent) => this._listView.search(e.detail.tag)}"
            on-multiselect="${() => (this._listView.multiSelect = true)}">
        </pl-menu>

        <div id="main">

            <pl-list-view
                store="${this._currentStore}"
                on-toggle-menu="${() => this._menu.toggle()}">
            </pl-list-view>

            <div id="views">

                <div id="placeholderView">
                    <pl-icon icon="logo" class="placeholder-icon"></pl-icon>
                </div>

                <pl-record-view store="${this._currentStore}"></pl-record-view>

                <pl-settings-view store="${this._currentStore}"></pl-settings-view>

                <pl-account-view></pl-account-view>

                <pl-store-view></pl-store-view>

            </div>

        </div>

        <pl-title-bar></pl-title-bar>
`;
    }

    @listen("lock", app)
    _locked() {
        this._main.classList.remove("active");
        this._showMenu = false;
        clearDialogs();
        clearClipboard();
    }

    @listen("unlock", app)
    _unlocked() {
        setTimeout(() => {
            this._main.classList.add("active");
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

    async _applyPath(path: string, direction = "forward") {
        let match;
        if (path === "settings") {
            this._openView(this._settingsView, direction);
        } else if (path === "account") {
            this._openView(this._accountView, direction);
        } else if ((match = path.match(/^store\/([^\/]+)(?:\/invite\/([^\/]+))?$/))) {
            const store = await app.getStore(match[1]);
            if (store) {
                this._storeView.store = store;
                this._openView(this._storeView, direction);
            }
        } else if ((match = path.match(/^org\/([^\/]+)(?:\/invite\/([^\/]+))?$/))) {
            const org = await app.getOrganization(match[1]);
            const invite = org && match[2] && org.getInvite(match[2]);
            console.log(org, invite);
        } else if ((match = path.match(/^record\/([^\/]+)$/))) {
            const item = app.getRecord(match[1]);
            if (item) {
                this._recordView.record = item.record;
                this._recordView.store = item.store;
                this._openView(this._recordView, direction);
            }
        } else {
            this._openView(null, direction);
        }
    }

    private async _openView(view: View | null, direction = "forward") {
        if (view === this._currentView) {
            return;
        }
        this._main.classList.toggle("showing-views", !!view);

        if (view) {
            const backward = direction === "backward" && this._currentView;
            animateElement(view, {
                animation: backward ? "viewOut" : "viewIn",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "backwards",
                direction: backward ? "reverse" : "normal"
            });
            view.classList.add("showing");
            view.active = true;
        }

        if (this._currentView) {
            const backward = direction === "backward" || !view;
            animateElement(this._currentView, {
                animation: backward ? "viewIn" : "viewOut",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "forwards",
                direction: backward ? "reverse" : "normal"
            });
            await wait(350);
            this._currentView.classList.remove("showing");
            this._currentView.active = false;
        }

        if (view !== this._recordView) {
            this._listView.clearSelection();
        }

        this._currentView = view;
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
            shortcut = () => this._listView.search();
        }
        // CTRL/CMD + N -> New Record
        else if (control && event.key === "n") {
            shortcut = () => this._newRecord();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        } else if (event.key.length === 1) {
            this._listView.search();
        }
    }

    @listen("backbutton", document)
    _androidBack() {
        if (!router.back()) {
            navigator.Backbutton && navigator.Backbutton.goBack();
        }
    }

    @listen("error", window)
    @listen("unhandledrejection", window)
    async _handleError(e: any) {
        const error = e.error || e.reason;
        switch (error.code) {
            case ErrorCode.INVALID_SESSION:
            case ErrorCode.SESSION_EXPIRED:
                await app.logout();
                alert($l("You've been logged out of your Padlock online account. Please login in again!"));
                break;
            case ErrorCode.DEPRECATED_API_VERSION:
                const confirmed = await confirm(
                    $l(
                        "A newer version of Padlock is available now! Update now to keep using " +
                            "online features (you won't be able to sync with your account until then)!"
                    ),
                    $l("Update Now"),
                    $l("Cancel"),
                    { type: "info" }
                );

                if (confirmed) {
                    checkForUpdates();
                }
                break;
            case ErrorCode.RATE_LIMIT_EXCEEDED:
                alert($l("It seems are servers are over capacity right now. Please try again later!"), {
                    type: "warning"
                });
                break;
            case ErrorCode.FAILED_CONNECTION:
                alert(
                    $l(
                        "Looks like we can't connect to our servers right now. Please check your internet " +
                            "connection and try again!"
                    ),
                    { type: "warning", title: $l("Failed Connection") }
                );
                break;
            case ErrorCode.SERVER_ERROR:
                confirm(
                    error.message ||
                        $l("Something went wrong while connecting to our servers. Please try again later!"),
                    $l("Contact Support"),
                    $l("Dismiss"),
                    { type: "warning" }
                ).then(confirmed => {
                    if (confirmed) {
                        window.open(`mailto:support@padlock.io?subject=Server+Error+(${error.code})`);
                    }
                });
                break;
        }
    }

    private _newRecord() {
        app.createRecord(this._currentStore, "");
    }
}

window.customElements.define("pl-app", App);
