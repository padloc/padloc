import { localize as $l } from "@padlock/core/lib/locale.js";
import { wait } from "@padlock/core/lib/util.js";
import { formatDateFromNow } from "../util.js";
import { shared, mixins } from "../styles";
import { animateCascade } from "../animation.js";
import { app, router } from "../init.js";
import { BaseElement, element, html, property, listen, observe } from "./base.js";
import "./toggle.js";

@element("pl-menu")
export class Menu extends BaseElement {
    @property({ reflect: true })
    open: boolean = false;
    @property({ attribute: "show-tags", reflect: true })
    _showingTags: boolean = false;

    @listen("stats-changed", app)
    @listen("account-changed", app)
    @listen("settings-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    render() {
        const { loggedIn, stats } = app;
        const lastSync = stats.lastSync && formatDateFromNow(stats.lastSync);
        const isTrialExpired = false;
        const isSubUnpaid = false;
        const isSubCanceled = false;
        const isSyncing = false;
        const tags = app.tags;

        return html`
        ${shared}

        <style>

            @keyframes menuItemIn {
                to { transform: translate3d(0, 0, 0); }
            }

            @keyframes menuItemOut {
                from { transform: translate3d(0, 0, 0); }
            }

            @keyframes subMenuIn {
                from { transform: translate3d(0, 100px, 0); opacity: 0; }
            }

            :host {
                ${mixins.fullbleed()}
                z-index: -1;
            }

            :host([open]) {
                z-index: 10;
            }

            .menu, .sub-menu {
                position: absolute;
                top: var(--title-bar-height);
                left: var(--main-padding);
                bottom: 0;
                z-index: -2;
                display: flex;
                flex-direction: column;
                width: var(--menu-width);
                box-sizing: border-box;
                color: var(--color-background);
                transition: opacity 0.3s;
            }

            .sub-menu {
                ${mixins.scroll()}
            }

            .menu-item {
                display: flex;
                align-items: center;
                height: 45px;
                justify-content: flex-end;
                position: relative;
                text-align: right;
                flex: none;
                --toggle-width: 35px;
                --toggle-height: 25px;
            }

            .menu-item > div {
                ${mixins.ellipsis()}
            }

            .menu .menu-item {
                transform: translate3d(calc(var(--menu-icon-width) - var(--menu-width)), 0, 0);
            }

            .sub-menu-header {
                font-size: 120%;
            }
            /*
            .sub-menu .menu-item:not(.sub-menu-header) {
                font-size: var(--font-size-small);
                height: 35px;
                --toggle-width: 30px;
                --toggle-height: 20px;
            }
            */

            .sub-menu .menu-item pl-icon {
                font-size: 90%;
                height: 35px;
                width: 35px;
                margin-right: 5px;
            }

            .menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .menu-item > pl-icon {
                width: 45px;
                height: 45px;
                font-size: 120%;
            }

            .menu-item > pl-toggle {
                margin: 0 10px;
                cursor: pointer;
            }

            .menu-item-hint {
                font-size: 12px;
            }

            .last-sync {
                opacity: 0.6;
            }

            .last-sync::before {
                font-family: "FontAwesome";
                font-size: 90%;
                content: "\\f017\\ ";
            }

            .menu-item-hint.warning {
                color: var(--color-error);
            }

            .menu-item-hint.warning::before {
                font-family: "FontAwesome";
                font-size: 85%;
                content: "\\f071\\ ";
                position: relative;
                top: -1px;
            }

            .menu-info {
                font-size: var(--font-size-tiny);
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.5);
                transition: opacity 400ms;
            }

            :host(:not([open])) .menu-info {
                opacity: 0;
            }

            :host([sub-menu]) .menu, :host(:not([sub-menu="tags"])) .sub-menu-tags, :host(:not([sub-menu="stores"])) .stores {
                opacity: 0;
                pointer-events: none;
            }

            .placeholder {
                padding: 0 15px;
                font-size: var(--font-size-small);
                text-align: right;
                width: 130px;
                align-self: flex-end;
            }
        </style>

            <div id="menu" class="menu">

                <div class="spacer"></div>

                <div class="account menu-item tap" @click=${() => router.go("account")}}>

                    <div>

                        <div ?hidden=${loggedIn}>${$l("Log In")}</div>

                        <div ?hidden=${!loggedIn}>${$l("My Account")}</div>

                        <div class="menu-item-hint warning" ?hidden=${!isTrialExpired}>${$l("Trial Expired")}</div>

                        <div class="menu-item-hint warning" ?hidden=${!isSubUnpaid}>${$l("Payment Failed")}</div>

                        <div class="menu-item-hint warning" ?hidden=${!isSubCanceled}>${$l("Subscr. Canceled")}</div>

                    </div>

                    <pl-icon icon="cloud" class="account-icon"></pl-icon>

                </div>

                <div class="menu-item tap" @click=${() => app.synchronize()} ?disabled=${!loggedIn}>

                    <div>

                        <div>${$l("Synchronize")}</div>

                        <div class="menu-item-hint" ?hidden=${loggedIn}>${$l("Log In To Sync")}</div>

                        <div class="menu-item-hint last-sync" ?hidden=${!loggedIn}>${lastSync}</div>

                    </div>

                    <pl-icon icon="refresh" ?spin=${isSyncing}></pl-icon>

                </div>

                <div class="menu-item tap" @click=${() => router.go("settings")}}>

                    <div>${$l("Settings")}</div>

                    <pl-icon icon="settings"></pl-icon>

                </div>

                <div class="menu-item tap" @click=${(e: Event) => this._showSubMenu("stores", e)}>

                    <div>${$l("Groups")}</div>

                    <pl-icon icon="group"></pl-icon>

                </div>

                <div class="menu-item tap" @click=${(e: Event) => this._showSubMenu("tags", e)}>

                    <div>${$l("Tags")}</div>

                    <pl-icon icon="tags"></pl-icon>

                </div>

                <div class="menu-item tap" @click=${() => this.dispatch("multiselect")}>

                    <div>${$l("Multi-Select")}</div>

                    <pl-icon icon="checked"></pl-icon>

                </div>

                <div class="menu-item tap" @click=${() => app.lock()}>

                    <div>${$l("Lock App")}</div>

                    <pl-icon icon="lock"></pl-icon>

                </div>

                <div class="spacer"></div>

                <div class="menu-info">

                    <div><strong>Padlock ${app.version}</strong></div>

                    <div>Made with ♥ in Germany</div>

                </div>

            </div>

            <div class="sub-menu sub-menu-tags">

                <div class="spacer"></div>

                <div class="menu-item sub-menu-header tap" @click=${(e: Event) => this._closeSubMenu(e)}>

                    <div>${$l("Tags")}</div>

                    <pl-icon icon="close"></pl-icon>
                </div>

                ${tags.map(
                    (tag: string) => html`
                    <div class="menu-item menu-item-tag tap" @click=${() => this._selectTag(tag)}>

                        <div>${tag}</div>

                        <pl-icon icon="tag"></pl-icon>

                    </div>
                `
                )}

                <div class="placeholder" disabled ?hidden=${tags.length}>

                    ${$l("You don't have any tags yet!")}

                </div>

                <div class="spacer"></div>

            </div>

        </div>
`;
    }

    @listen("click")
    _clickHandler() {
        this.open = false;
        this._closeSubMenu();
    }

    @observe("open")
    async _openChanged() {
        this.dispatch(this.open ? "menu-open" : "menu-close");
        animateCascade(this.$$(".menu .menu-item"), {
            animation: this.open ? "menuItemIn" : "menuItemOut",
            duration: 400,
            fullDuration: 600,
            initialDelay: 50,
            fill: "both"
        });
    }

    toggle() {
        this.open = !this.open;
    }

    private _showSubMenu(name: string, e: Event) {
        this.open = true;
        this.setAttribute("sub-menu", name);
        animateCascade(this.$$(`.sub-menu.${name} .menu-item, .sub-menu.${name} .placeholder`, false), {
            animation: "subMenuIn",
            duration: 400,
            fullDuration: 600,
            fill: "both"
        });
        e.stopPropagation();
    }

    private _closeSubMenu(e?: Event) {
        this.removeAttribute("sub-menu");
        e && e.stopPropagation();
    }

    private async _selectTag(tag: string) {
        this.dispatch("select-tag", { tag });
        await wait(350);
        this._closeSubMenu();
    }
}
