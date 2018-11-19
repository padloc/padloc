import { FilterParams } from "@padlock/core/lib/app.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, property, html, listen } from "./base.js";

@element("pl-menu")
export class Menu extends BaseElement {
    @property()
    selected: string = "items";

    @listen("unlock", app)
    @listen("vault-created", app)
    @listen("vault-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    private _filter(params: FilterParams) {
        app.filter = params;
        router.go("items");
    }

    render() {
        return html`
        ${shared}

        <style>
            :host {
                display: block;
                flex-direction: column;
                color: var(--color-tertiary);
                font-size: var(--font-size-small);
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

            .logo {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 150%;
                color: rgba(0, 0, 0, 0.3);
                padding: 10px;
                margin-bottom: 10px;
            }

            .logo .version {
                font-weight: normal;
                padding: 0 5px;
                font-size: var(--font-size-tiny);
            }
        </style>

        <div class="logo">

            <pl-icon icon="logo"></pl-icon>

            <div>Padlock</div>

            <div class="version">v3.0</div>

        </div>

        <nav>

            <ul>

                <li class="tap" @click=${() => this._filter({})} ?selected=${this.selected === "items"}>

                    <pl-icon icon="list"></pl-icon>

                    <div>${$l("Items")}</div>

                </li>

                <li class="tap" @click=${() => router.go("settings")} ?selected=${this.selected === "settings"}>

                    <pl-icon icon="settings"></pl-icon>

                    <div>${$l("Settings")}</div>

                </li>

                <li class="tap" @click=${() => router.go("vaults")} ?selected=${this.selected === "vaults"}>

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
`;
    }
}
