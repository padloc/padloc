import { Store } from "@padlock/core/lib/data.js";
import { getPlatformName, getDeviceInfo, isTouch } from "@padlock/core/lib/platform.js";
import config from "../styles/config.js";
import sharedStyles from "../styles/shared.js";
import { app } from "../init.js";
import { BaseElement, html, property, query } from "./base.js";
import "./account-view.js";
import "./icon.js";
import { ListView } from "./list-view.js";
import { RecordView } from "./record-view.js";
import "./settings-view.js";
import { StartView } from "./start-view.js";
import { TitleBar } from "./title-bar.js";
import "./menu.js";
import { Input } from "./input.js";
import { clearDialogs } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { animateElement } from "../animation.js";

// TODO: auto lock, auto sync, hints, tracking

const cordovaReady = new Promise(resolve => {
    document.addEventListener("deviceready", resolve);
});

class App extends BaseElement {
    @property() private _currentView: string = "";
    @property() private _menuOpen: boolean = false;
    @property() private _currentStore: Store = app.mainStore;

    @query("#main") private _main: HTMLDivElement;
    @query("pl-title-bar") private _titleBar: TitleBar;
    @query("pl-list-view") private _listView: ListView;
    @query("pl-record-view") private _recordView: RecordView;
    @query("pl-start-view") private _startView: StartView;

    constructor() {
        super();
        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);

        document.addEventListener("dialog-open", () => this.classList.add("dialog-open"));
        document.addEventListener("dialog-close", () => this.classList.remove("dialog-open"));

        app.addEventListener("lock", () => {
            this._main.classList.remove("active");
            this._menuOpen = false;
            clearDialogs();
            clearClipboard();
            this._currentView = "";
        });

        app.addEventListener("unlock", () => {
            setTimeout(() => {
                this._main.classList.add("active");
            }, 600);
        });
    }

    get _isNarrow() {
        return this.offsetWidth < 600;
    }

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

        if (!isTouch()) {
            window.addEventListener("focus", () =>
                setTimeout(() => {
                    if (app.locked) {
                        this._startView.focus();
                    }
                }, 100)
            );
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

            @keyframes viewOutBack {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(0, 0, -200px) rotateX(10deg); }
            }

            @keyframes viewOutSide {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(100%, 0, 0) rotateY(-30deg); }
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
                --menu-width: 200px;
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

            #main, #listView {
                transform: translate3d(0, 0, 0);
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
            }

            #main:not(.active),
            :host(.dialog-open) #main {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
            }

            #main.show-menu {
                transform: translate3d(calc(var(--menu-width) - var(--menu-icon-width)), 0, 0) rotateY(-5deg);
            }

            :host(:not(.macos):not(.windows):not(.linux)) pl-title-bar {
                display: none;
            }

            #listView {
                flex: 1;
                overflow: hidden;
            }

            #pages {
                position: relative;
                flex: 1.62; /* Golden Ratio ;) */
                margin-left: var(--gutter-width);
                pointer-events: none;
                perspective: 1000px;
            }

            .view {
                transform: translate3d(0, 0, 0);
                overflow: hidden;
            }

            .view.showing {
                pointer-events: auto;
            }

            .view:not(.showing) {
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
                #pages {
                    flex: 1;
                }
            }

            @media (max-width: 700px) {
                :host {
                    --menu-icon-width: 0px;
                }

                .showing-pages #listView {
                    transform: translate3d(0, 0, -150px) rotateX(10deg);
                }

                #pages {
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
            id="menu"
            open="${this._menuOpen}"
            on-menu-close="${() => (this._menuOpen = false)}"
            on-open-settings="${() => this._openSettings()}"
            on-open-account-view="${() => this._openAccountView()}">
        </pl-menu>

        <div id="main">

            <pl-list-view
                id="listView"
                store="${this._currentStore}"
                on-open-settings="${() => this._openSettings()}"
                on-open-account-view="${() => this._openAccountView()}"
                on-select-record="${(e: CustomEvent) => this._recordSelected(e)}"
                on-toggle-menu="${() => this._toggleMenu()}">
            </pl-list-view>

            <div id="pages">

                <div id="placeholderView">

                    <pl-icon icon="logo" class="placeholder-icon"></pl-icon>

                </div>

                <pl-record-view
                    id="recordView"
                    class="view"
                    store="${this._currentStore}"
                    on-record-close="${() => this._closeRecord()}">
                </pl-record-view>

                <pl-settings-view
                    id="settingsView"
                    class="view"
                    store="${this._currentStore}"
                    on-settings-back="${() => this._settingsBack()}">
                </pl-settings-view>

                <pl-account-view
                    id="accountView"
                    class="view"
                    on-account-back="${() => this._accountViewBack()}">
                </pl-account-view>

            </div>

        </div>

        <pl-title-bar></pl-title-bar>
`;
    }

    _didRender(_: any, changed: any, prev: any) {
        this._main.classList.toggle("show-menu", this._menuOpen);
        if (changed && typeof changed._currentView !== "undefined") {
            this._currentViewChanged(changed._currentView, prev._currentView);
        }
    }

    _closeRecord() {
        this._listView.clearSelection();
    }

    _recordSelected(e: CustomEvent) {
        const record = e.detail.record;
        if (record) {
            this._recordView.record = record;
            this._currentView = "recordView";
        } else if (this._currentView == "recordView") {
            this._currentView = "";
        }
    }

    _openSettings() {
        this._currentView = "settingsView";
        this._listView.clearSelection();
    }

    _settingsBack() {
        this._currentView = "";
    }

    _openAccountView() {
        this._currentView = "accountView";
        this._listView.clearSelection();
        // if (!this.settings.syncConnected && !isTouch()) {
        //     setTimeout(() => this.$.accountView.focusEmailInput(), 500);
        // }
    }

    _accountViewBack() {
        this._currentView = "";
    }

    _currentViewChanged(curr: string, prev: string) {
        this._main.classList.toggle("showing-pages", !!curr);

        const currView = curr && this[`_${curr}`];
        const prevView = curr && this[`_${prev}`];

        if (currView) {
            animateElement(currView, {
                animation: "viewIn",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "backwards"
            });
            currView.classList.add("showing");
            currView.animate();
        }
        if (prevView) {
            animateElement(prevView, {
                animation: !curr || this._isNarrow ? "viewOutSide" : "viewOutBack",
                duration: 400,
                easing: "cubic-bezier(0.6, 0, 0.2, 1)",
                fill: "forwards"
            });
            setTimeout(() => prevView.classList.remove("showing"), 350);
        }
    }

    //* Keyboard shortcuts
    _keydown(event: KeyboardEvent) {
        if (app.locked || Input.activeInput) {
            return;
        }

        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            shortcut = () => this._back();
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

    _back() {
        switch (this._currentView) {
            case "recordView":
                this._closeRecord();
                break;
            case "settingsView":
                this._settingsBack();
                break;
            case "accountView":
                this._accountViewBack();
                break;
            default:
                if (this._listView.filterString) {
                    this._listView.clearFilter();
                } else {
                    navigator.Backbutton && navigator.Backbutton.goBack();
                }
        }
    }

    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    _newRecord() {
        app.createRecord(this._currentStore, "");
    }

    _enableMultiSelect() {
        this._listView.multiSelect = true;
    }
}

window.customElements.define("pl-app", App);
