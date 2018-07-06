import { getPlatformName, getDeviceInfo, isTouch } from "@padlock/core/lib/platform.js";
import { State } from "@padlock/core/lib/app.js";
import { Record } from "@padlock/core/lib/data.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared.js";
import "./cloud-view.js";
import "./icon.js";
import "./list-view.js";
import "./record-view.js";
import "./settings-view.js";
import "./start-view.js";
import "./title-bar.js";
import "./menu.js";
import { Input } from "./input.js";
import { View } from "./view.js";
import { clearDialogs } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { animateElement } from "../animation.js";
// import {
//     NotificationMixin,
//     DialogMixin,
//     MessagesMixin,
//     DataMixin,
//     AnimationMixin,
//     ClipboardMixin,
//     SyncMixin,
//     AutoLockMixin,
//     HintsMixin,
//     LocaleMixin
// } from "../mixins";

const cordovaReady = new Promise(resolve => {
    document.addEventListener("deviceready", resolve);
});

class App extends View {
    static get properties() {
        return {
            _currentView: String,
            _menuOpen: Boolean,
            _locked: Boolean
        };
    }

    constructor() {
        super();

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);

        document.addEventListener("dialog-open", () => this.classList.add("dialog-open"));
        document.addEventListener("dialog-close", () => this.classList.remove("dialog-open"));
    }

    _stateChanged({ locked }: State) {
        this._locked = locked;
        if (locked) {
            this._currentView = "";
        }
    }

    get _isNarrow() {
        return this.offsetWidth < 600;
    }

    get _main() {
        return this.shadowRoot.querySelector("#main");
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
            this.root.querySelector("pl-title-bar").classList.add(className);
        }

        if (!isTouch()) {
            window.addEventListener("focus", () =>
                setTimeout(() => {
                    if (this._locked) {
                        this.$.startView.focus();
                    }
                }, 100)
            );
        }
    }

    _render() {
        return html`
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
            on-open-cloud-view="${() => this._openCloudView()}">
        </pl-menu>

        <div id="main">

            <pl-list-view
                id="listView"
                on-open-settings="${() => this._openSettings()}"
                on-open-cloud-view="${() => this._openCloudView()}"
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
                    on-record-close="${() => this._closeRecord()}">
                </pl-record-view>

                <pl-settings-view
                    id="settingsView"
                    class="view"
                    on-settings-back="${() => this._settingsBack()}">
                </pl-settings-view>

                <pl-cloud-view
                    id="cloudView"
                    class="view"
                    on-cloud-back="${() => this._cloudViewBack()}">
                </pl-cloud-view>

            </div>

        </div>

        <pl-title-bar></pl-title-bar>
`;
    }

    _didRender(_: any, changed: any, prev: any) {
        console.log("changed", arguments);
        if (changed && typeof changed._locked !== "undefined") {
            this._lockedChanged();
        }
        this._main.classList.toggle("show-menu", this._menuOpen);
        if (changed && typeof changed._currentView !== "undefined") {
            this._currentViewChanged(changed._currentView, prev._currentView);
        }
    }

    _lockedChanged() {
        if (this._locked) {
            this._main.classList.remove("active");
            this._menuOpen = false;
            clearDialogs();
            clearClipboard();
        } else {
            setTimeout(() => {
                this._main.classList.add("active");
            }, 600);
        }
    }

    _closeRecord() {
        this.shadowRoot.querySelector("#listView").deselect();
    }

    _recordSelected(e: CustomEvent) {
        const record = e.detail.record as Record | null;
        clearTimeout(this._selectedRecordChangedTimeout);
        this._selectedRecordChangedTimeout = setTimeout(() => {
            if (record) {
                this.shadowRoot.querySelector("#recordView").record = record;
                this._currentView = "recordView";
            } else if (this._currentView == "recordView") {
                this._currentView = "";
            }
        }, 10);
    }

    _openSettings() {
        this._currentView = "settingsView";
        this.shadowRoot.querySelector("#listView").deselect();
    }

    _settingsBack() {
        this._currentView = "";
    }

    _openCloudView() {
        this._currentView = "cloudView";
        this.shadowRoot.querySelector("#listView").deselect();
        // if (!this.settings.syncConnected && !isTouch()) {
        //     setTimeout(() => this.$.cloudView.focusEmailInput(), 500);
        // }
    }

    _cloudViewBack() {
        this._currentView = "";
    }

    _currentViewChanged(curr: string, prev: string) {
        this._main.classList.toggle("showing-pages", !!curr);

        const currView = curr && this.shadowRoot.querySelector("#" + curr);
        const prevView = prev && this.shadowRoot.querySelector("#" + prev);
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
        if (this._locked || Input.activeInput) {
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
            shortcut = () => this.$.listView.search();
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
            this.$.listView.search();
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
            case "cloudView":
                this._cloudViewBack();
                break;
            default:
                if (this.$.listView.filterActive) {
                    this.$.listView.clearFilter();
                } else {
                    navigator.Backbutton && navigator.Backbutton.goBack();
                }
        }
    }

    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
    }

    _lock() {
        if (this.isSynching) {
            this.alert($l("Cannot lock app while sync is in progress!"));
        } else {
            this.app.lock();
        }
    }

    _newRecord() {
        const record = this.app.createRecord("");
        this.app.selectRecord(record);
    }

    _enableMultiSelect() {
        this.$.listView.multiSelect = true;
    }
}

window.customElements.define("pl-app", App);
