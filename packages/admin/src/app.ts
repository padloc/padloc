import { css, customElement, html, LitElement, property, query, state } from "@padloc/app/src/elements/lit";
import { ServiceWorker } from "@padloc/app/src/mixins/service-worker";
import { StateMixin } from "@padloc/app/src/mixins/state";
import { Routing } from "@padloc/app/src/mixins/routing";
import { mixins, shared } from "@padloc/app/src/styles";
import "@padloc/app/src/elements/button";
import "@padloc/app/src/elements/icon";
import "@padloc/app/src/elements/start";
import { Dialog } from "@padloc/app/src/elements/dialog";
import "@padloc/app/src/elements/list";
import { $l } from "@padloc/locale/src/translate";
import "./logs";
import "./accounts";

@customElement("pl-admin-app")
export class App extends ServiceWorker(StateMixin(Routing(LitElement))) {
    @property({ attribute: false })
    readonly routePattern = /^([^\/]*)(?:\/([^\/]+))?/;

    private _pages = ["start", "unlock", "login", "config", "accounts", "logs"];

    @property({ type: Boolean, reflect: true, attribute: "singleton-container" })
    readonly singletonContainer = true;

    @state()
    protected _ready = false;

    @state()
    protected _page: string = "start";

    @query(".wrapper")
    protected _wrapper: HTMLDivElement;

    constructor() {
        super();
        this.load();
    }

    async load() {
        await this.app.load();
        // Try syncing account so user can unlock with new password in case it has changed
        if (this.app.state.loggedIn) {
            this.app.fetchAccount();
            this.app.fetchAuthInfo();
        }
        this._ready = true;
        // this.routeChanged();
        const spinner = document.querySelector(".spinner") as HTMLElement;
        spinner.style.display = "none";
    }

    async handleRoute(
        [page]: [string, string],
        { next, ...params }: { [prop: string]: string | undefined },
        path: string
    ) {
        if (page === "oauth") {
            window.opener?.postMessage(
                { type: "padloc_oauth_redirect", url: window.location.toString() },
                window.location.origin
            );
            return;
        }

        if (!this.app.state.loggedIn) {
            if (!["start", "login"].includes(page)) {
                this.go("start", { next: path || undefined, ...params }, true);
                return;
            }
        } else if (this.app.state.locked) {
            if (!["unlock"].includes(page)) {
                this.go("unlock", { next: next || path || undefined, ...params }, true);
                return;
            }
        } else if (next && !["start", "login", "unlock"].includes(next)) {
            this.go(next, params, true);
            return;
        }

        if (!page || !this._pages.includes(page)) {
            this.redirect("config");
            return;
        }

        this._page = page;
        const unlocked = !["start", "login", "unlock"].includes(page);
        setTimeout(() => this._wrapper.classList.toggle("active", unlocked), unlocked ? 600 : 0);
    }

    static styles = [
        shared,
        css`
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
            }

            :host {
                font-family: var(--font-family), var(--font-family-fallback) !important;
                font-size: var(--font-size-base);
                font-weight: var(--font-weight-default);
                overflow: hidden;
                color: var(--color-foreground);
                position: fixed;
                width: 100%;
                height: 100%;
                animation: fadeIn 0.5s;
                display: flex;
                flex-direction: column;
                background: var(--app-backdrop-background);
                letter-spacing: var(--letter-spacing);
                --inset-top: max(calc(env(safe-area-inset-top, 0) - 0.5em), 0em);
                --inset-bottom: max(calc(env(safe-area-inset-bottom, 0) - 1em), 0em);
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

            .views {
                flex: 1;
                position: relative;
                overflow: hidden;
            }

            .views > * {
                ${mixins.fullbleed()};
                top: var(--inset-top);
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

            .menu {
                width: 15em;
                border-right: solid 1px var(--border-color);
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
            }

            @media (min-width: 1200px) {
                .wrapper {
                    border-radius: 1em;
                    overflow: hidden;
                    box-shadow: var(--app-wrapper-shadow);
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
        return html`
            <div class="main">
                <pl-start id="startView" active asAdmin></pl-start>

                <div class="wrapper">
                    <div class="small padded menu">
                        <pl-list class="vertical spacing layout">
                            <div
                                class="menu-item horizontal spacing center-aligning layout"
                                role="link"
                                @click=${() => this.router.go("accounts")}
                                aria-selected=${this._page === "accounts"}
                            >
                                <pl-icon icon="group"></pl-icon>
                                <div>${$l("Accounts")}</div>
                            </div>

                            <div
                                class="menu-item horizontal spacing center-aligning layout"
                                role="link"
                                @click=${() => this.router.go("logs")}
                                aria-selected=${this._page === "logs"}
                            >
                                <pl-icon icon="list"></pl-icon>
                                <div>${$l("Logs")}</div>
                            </div>
                        </pl-list>
                    </div>
                    <div class="views">
                        <pl-admin-accounts ?hidden=${this._page !== "accounts"}></pl-admin-accounts>
                        <pl-admin-logs ?hidden=${this._page !== "logs"}></pl-admin-logs>
                    </div>
                </div>

                <slot></slot>
            </div>
        `;
    }

    updated() {
        const theme = this.theme;
        document.body.classList.toggle("theme-dark", theme === "dark");
        document.body.classList.toggle("theme-light", theme === "light");
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("dialog-open", (e: any) => this._dialogOpen(e));
        this.addEventListener("dialog-close", () => this._dialogClose());
    }

    _dialogOpen(e: CustomEvent) {
        const dialog = e.target as Dialog<any, any>;
        this.classList.add("dialog-open");
        if (dialog.hideApp) {
            this.classList.add("hide-this.app");
        }
    }

    _dialogClose() {
        this.classList.remove("dialog-open");
        this.classList.remove("hide-this.app");
    }
}
