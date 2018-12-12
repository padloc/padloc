import "@polymer/paper-spinner/paper-spinner-lite.js";
import { FilterParams } from "@padloc/core/lib/app.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, property, html, listen } from "./base.js";
import "./logo.js";

@element("pl-menu")
export class Menu extends BaseElement {
    @property()
    selected: string = "items";

    @listen("unlock", app)
    @listen("vault-created", app)
    @listen("vault-changed", app)
    @listen("start-sync", app)
    @listen("finish-sync", app)
    _refresh() {
        this.requestUpdate();
    }

    private _filter(params: FilterParams) {
        app.filter = params;
        this._goTo("items");
    }

    private _goTo(path: string) {
        this.dispatch("toggle-menu");
        router.go(path);
    }

    render() {
        return html`
        ${shared}

        <style>
            :host {
                display: flex;
                flex-direction: column;
                color: var(--color-tertiary);
                font-size: var(--font-size-small);
            }

            .scroller {
                flex: 1;
                height: 0;
                ${mixins.scroll()}
                padding: 10px 0;
            }

            li {
                display: flex;
                align-items: center;
                height: 40px;
                margin: 2px 10px;
                padding-right: 10px;
                border-radius: 8px;
                overflow: hidden;
                height: 40px;
            }

            li:not([selected]):hover {
                background: rgba(0, 0, 0, 0.1);
            }

            li[selected] {
                background: rgba(255, 255, 255, 0.2);
            }

            li div {
                flex: 1;
                ${mixins.ellipsis()}
            }

            h3 {
                font-size: 100%;
                margin-top: 30px;
                padding: 0 20px;
                opacity: 0.8;
                font-weight: normal;
            }

            .vault, .subvault, .menu-tag {
                height: 35px;
                font-size: var(--font-size-tiny);
            }

            .vault pl-icon, .subvault pl-icon, .menu-tag pl-icon {
                width: 30px;
                height: 30px;
                font-size: 90%;
            }

            .subvault {
                padding-left: 15px;
            }

            .subvault pl-icon {
                font-size: 80%;
            }

            pl-logo {
                height: 30px;
                margin: 15px 0 20px 0;
                opacity: 0.25;
            }

            .no-tags {
                font-size: var(--font-size-micro);
                padding: 0 20px;
                opacity: 0.5;
                width: 100px;
            }

            .footer {
                padding: 5px;
                display: flex;
                align-items: center;
            }

            .footer pl-icon {
                width: 30px;
                height: 30px;
                font-size: var(--font-size-tiny);
            }

            .syncing {
                width: 20px;
                height: 20px;
                margin: 5px;
                --paper-spinner-color: currentColor;
                --paper-spinner-stroke-width: 2px;
            }
        </style>

        <div class="scroller">

            <pl-logo></pl-logo>

            <nav>

                <ul>

                    <li class="tap" @click=${() => this._filter({})} ?selected=${this.selected === "items"}>

                        <pl-icon icon="list"></pl-icon>

                        <div>${$l("Items")}</div>

                    </li>

                    <li class="tap" @click=${() => this._goTo("settings")} ?selected=${this.selected === "settings"}>

                        <pl-icon icon="settings"></pl-icon>

                        <div>${$l("Settings")}</div>

                    </li>

                    <li class="tap" @click=${() => this._goTo("vaults")} ?selected=${this.selected === "vaults"}>

                        <pl-icon icon="vaults"></pl-icon>

                        <div>${$l("Manage")}</div>

                    </li>

                </ul>

            </nav>

            <h3>${$l("Vaults")}</h3>

            <ul>

                ${app.vaults.map(
                    vault => html`
                    <li
                        class="vault tap ${vault.parent ? "subvault" : ""}"
                        @click=${() => this._filter({ vault })}>

                        <pl-icon icon="vault"></pl-icon>

                        <div>${vault.name}</div> 

                    </li>
                `
                )}

            </ul>

            <h3>${$l("Tags")}</h3>

            <div class="no-tags" ?hidden=${!!app.tags.length}>${$l("You don't have any tags yet.")}</div>

            <ul>

                ${app.tags.map(
                    tag => html`
                    <li
                        class="menu-tag tap"
                        @click=${() => this._filter({ tag })}>

                        <pl-icon icon="tag"></pl-icon>

                        <div>${tag}</div> 

                    </li>
                `
                )}

            </ul>

        </div>

        <div class="footer">
            <pl-icon icon="lock" class="tap" @click=${() => app.lock()}></pl-icon>
            <pl-icon icon="refresh" class="tap" @click=${() => app.synchronize()}></pl-icon>
            <div class="flex"></div>
            <paper-spinner-lite .active=${app.syncing} class="syncing"></paper-spinner-lite>
        </div>
`;
    }
}
