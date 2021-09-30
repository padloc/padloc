import { translate as $l } from "@padloc/locale/src/translate";
import { composeEmail } from "@padloc/core/src/platform";
import { app, router } from "../globals";
import { StateMixin } from "../mixins/state";
import { View } from "./view";
import "./icon";
import "./randomart";
import "./scroller";
import "./button";
import "./list";
import { customElement, state } from "lit/decorators.js";
import { css, html } from "lit";
import "./select";
import { Routing } from "../mixins/routing";
import "./settings-security";
import "./settings-tools";
import "./settings-account";
import "./settings-display";

@customElement("pl-settings")
export class Settings extends StateMixin(Routing(View)) {
    readonly routePattern = /^settings(?:\/(\w+))?/;

    private readonly _pages = ["", "account", "security", "display", "about", "tools"];

    @state()
    private _page?: string;

    handleRoute([page]: [string]) {
        if (page && !this._pages.includes(page)) {
            this.redirect(`settings`);
            return;
        }

        this._page = page;
    }

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            .wrapper {
                max-width: 30em;
                margin: 0 auto;
            }

            .menu {
                width: 15em;
                border-right: solid 1px var(--border-color);
            }

            .selectable-list > :not(:last-child) {
                border-bottom: solid 1px var(--border-color);
            }
        `,
    ];

    render() {
        return html`
            <div class="fullbleed pane layout ${this._page ? "open" : ""}">
                <div class="vertical layout menu">
                    <header class="padded spacing center-aligning horizontal layout">
                        <pl-button
                            class="transparent skinny"
                            @click=${() =>
                                this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                        >
                            <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                                <pl-icon icon="settings"></pl-icon>
                                <div class="stretch ellipsis">${$l("Settings")}</div>
                            </div>
                        </pl-button>
                    </header>
                    <pl-scroller class="stretch">
                        <nav class="margined">
                            <pl-list class="small">
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "account"}
                                    @click=${() => this.go("settings/account")}
                                >
                                    <pl-icon icon="user"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Account")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "security"}
                                    @click=${() => this.go("settings/security")}
                                >
                                    <pl-icon icon="lock"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Security")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "display"}
                                    @click=${() => this.go("settings/display")}
                                >
                                    <pl-icon icon="display"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Display")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "billing"}
                                    @click=${() => this.go("settings/billing")}
                                    hidden
                                >
                                    <pl-icon icon="billing"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Billing & Plans")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "tools"}
                                    @click=${() => this.go("settings/tools")}
                                >
                                    <pl-icon icon="tools"></pl-icon>
                                    <div class="stretch ellipsis">${$l("Tools")}</div>
                                </div>
                                <div
                                    role="link"
                                    class="double-padded horizontally-margined list-item spacing center-aligning horizontal layout hover click"
                                    aria-selected=${this._page === "about"}
                                    @click=${() => this.go("settings/about")}
                                >
                                    <pl-icon icon="info-round"></pl-icon>
                                    <div class="stretch ellipsis">${$l("About Padloc")}</div>
                                </div>
                            </pl-list>
                        </nav>
                    </pl-scroller>
                </div>

                <div class="stretch background relative">
                    <div class="fullbleed vertical layout" ?hidden=${this._page !== "about"}>
                        <header class="padded center-aligning horizontal layout">
                            <pl-button class="transparent back-button" @click=${() => router.go("settings")}>
                                <pl-icon icon="backward"></pl-icon>
                            </pl-button>
                            <pl-icon icon="info-round" class="left-margined vertically-padded wide-only"></pl-icon>
                            <div class="padded stretch ellipsis">${$l("About Padloc")}</div>
                        </header>

                        <pl-scroller class="stretch">
                            <div class="double-padded spacing vertical layout">
                                <pl-button @click=${() => this._openWebsite()}>${$l("Website")}</pl-button>

                                <pl-button @click=${() => this._sendMail()}>${$l("Contact Support")}</pl-button>
                            </div>
                        </pl-scroller>
                    </div>

                    <pl-settings-security class="fullbleed" ?hidden=${this._page !== "security"}></pl-settings-security>

                    <pl-settings-tools class="fullbleed" ?hidden=${this._page !== "tools"}></pl-settings-tools>

                    <pl-settings-account class="fullbleed" ?hidden=${this._page !== "account"}></pl-settings-account>

                    <pl-settings-display class="fullbleed" ?hidden=${this._page !== "display"}></pl-settings-display>
                </div>
            </div>
        `;
    }

    private _openWebsite() {
        window.open("https://padloc.app", "_system");
    }

    private _sendMail() {
        const email = process.env.PL_SUPPORT_EMAIL || "";
        const subject = "Padloc Support Request";
        const message = `

----- enter your message above -----

NOTE: Below we have included some information about your device that may help
us analyse any problems you may be having. If you're not comfortable sharing
this data simply delete this of the email!

Device Info: ${JSON.stringify(app.state.device.toRaw(), null, 4)}
`;

        composeEmail(email, subject, message);
    }
}
