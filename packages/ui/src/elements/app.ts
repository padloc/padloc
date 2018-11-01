import { checkForUpdates, getDeviceInfo } from "@padlock/core/lib/platform.js";
import { wait } from "@padlock/core/lib/util.js";
import { ErrorCode } from "@padlock/core/lib/error.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { FilterParams } from "@padlock/core/lib/app.js";
import { config, shared, mixins } from "../styles";
import { app, router } from "../init.js";
import { BaseElement, html, property, query, listen } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { View } from "./view.js";
import { Browse } from "./browse.js";
import { Settings } from "./settings.js";
import { Manage } from "./manage.js";
import { Start } from "./start.js";
import { alert, confirm, clearDialogs } from "../dialog.js";
import { clearClipboard } from "../clipboard.js";
import { animateElement } from "../animation.js";
import "./menu.js";

// TODO: auto lock, auto sync, hints, tracking

const cordovaReady = new Promise(resolve => {
    document.addEventListener("deviceready", resolve);
});

class App extends BaseElement {
    @query("#views")
    private _views: HTMLDivElement;
    @query("pl-start")
    private _startView: Start;
    @query("pl-browse")
    private _browse: Browse;
    @query("pl-settings")
    private _settings: Settings;
    @query("pl-mangage")
    private _manage: Manage;

    @property()
    private _view: View | null;

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

        const { platform } = await getDeviceInfo();
        const className = platform.toLowerCase().replace(/ /g, "-");
        if (className) {
            this.classList.add(className);
            this._titleBar.classList.add(className);
        }
    }

    @listen("filter")
    filter(e: CustomEvent) {
        this._browse.filter(e.detail as FilterParams);
    }

    render() {
        return html`
        ${config.cssVars}
        ${shared}

        <style>
            :host {
                --color-gutter: #eee;
                overflow: hidden;
                color: var(--color-foreground);
                background: var(--color-gutter);
                position: absolute;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s backwards 0.2s;
                perspective: 1000px;
            }

            #views {
                ${mixins.fullbleed()}
                overflow: hidden;
                perspective: 1000px;
                transform: translate3d(0, 0, 0);
                transform-origin: 0 center;
                transition: transform 0.4s cubic-bezier(0.6, 0, 0.2, 1);
            }

            #views:not(.active),
            :host(.dialog-open) #views {
                transform: translate3d(0, 0, -150px) rotateX(5deg);
            }

            #views > * {
                ${mixins.fullbleed()}
                transform: translate3d(0, 0, 0);
                overflow: hidden;
                transition: transform 0.3s, opacity 0.3s;
            }

            #views > .left {
                transform: translate3d(-200px, 0, 0);
                pointer-events: none;
                opacity: 0;
            }

            #views > .right {
                transform: translate3d(200px, 0, 0);
                pointer-events: none;
                opacity: 0;
            }

        </style>

        <pl-start id="startView"></pl-start>

        <div id="views">

            <pl-settings class="${this._view === this._settings ? "" : "left"}"></pl-settings>

            <pl-browse class="${
                this._view === this._settings ? "right" : this._view === this._manage ? "left" : ""
            }"></pl-browse>

            <pl-manage class="${this._view === this._manage ? "" : "right"}"></pl-manage>

        </div>
`;
    }

    @listen("lock", app)
    _locked() {
        this._views.classList.remove("active");
        clearDialogs();
        clearClipboard();
    }

    @listen("unlock", app)
    _unlocked() {
        setTimeout(() => {
            this._views.classList.add("active");
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

    async _applyPath(path: string) {
        let match;
        if (path === "settings") {
            this._openView(this._settings);
        } else if ((match = path.match(/^manage\/(?:([^\/]+)(?:\/invite\/([^\/]+))?)?$/))) {
            const vault = await app.getVault({ id: match[1] });
            if (vault) {
                this._manage.vault = vault;
            }
            this._openView(this._manage);
        } else if ((match = path.match(/^browse(?:\/([^\/]+))?$/))) {
            const item = (match[1] && app.getItem(match[1])) || null;
            this._browse.item = item;
            this._openView(this._browse);
        } else {
            this._browse.item = null;
            this._openView(this._browse);
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
        // else if (control && event.key === "f") {
        //     shortcut = () => this._listView.search();
        // }
        // CTRL/CMD + N -> New Record
        else if (control && event.key === "n") {
            shortcut = () => this._newRecord();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        } else if (!control && event.key.length === 1) {
            // this._listView.search();
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
        app.createRecord("");
    }
}

window.customElements.define("pl-app", App);
