import { localize as $l } from "@padlock/core/lib/locale.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, listen } from "./base.js";

@element("pl-menu")
export class Menu extends BaseElement {
    _mainMenu = [
        { path: "", label: $l("Home"), icon: "logo" },
        { path: "settings", label: $l("Settings"), icon: "settings" },
        { path: "account", label: $l("Account"), icon: "user" }
    ];

    @listen("unlock", app)
    _refresh() {
        this.requestUpdate();
    }

    render() {
        return html`
        ${shared}

        <style>
            :host {
                color: var(--color-tertiary);
                padding: 10px 0;
                font-size: var(--font-size-small);
            }

            ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            li {
                display: flex;
                align-items: center;
                height: 40px;
                padding: 0 10px;
            }

            li:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            li div {
                flex: 1;
                ${mixins.ellipsis()}
            }

            h3 {
                font-size: 100%;
                padding: 0 20px;
                opacity: 0.8;
                font-weight: normal;
            }

            .subvault {
                font-size: var(--font-size-tiny);
                height: 35px;
                padding-left: 30px;
            }

            .menu-tag {
                font-size: var(--font-size-tiny);
                height: 35px;
            }
        </style>

        <nav>

            <ul>

                ${this._mainMenu.map(
                    ({ path, label, icon }) => html`
                <li class="tap" @click=${() => router.go(path)}>

                    <pl-icon icon="${icon}"></pl-icon>

                    <div>${label}</div>

                </li>
                `
                )}

            </ul>

        </nav>

        <h3>${$l("Vaults")}</h3>

        <ul>

            <li
                class="vault tap"
                @click=${() => this.dispatch("filter", {})}>

                <pl-icon icon="supervault"></pl-icon>

                <div>${$l("All Vaults")}</div> 

            </li>

            ${app.vaults.map(
                vault => html`
                <li
                    class="vault tap ${vault.parent ? "subvault" : ""}"
                    @click=${() => this.dispatch("filter", { vault })}>

                    <pl-icon icon="${vault === app.mainVault ? "user" : "vault"}"></pl-icon>

                    <div>${vault.name}</div> 

                    <pl-icon icon="settings"></pl-icon>

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
                    @click=${() => this.dispatch("filter", { tag })}>

                    <pl-icon icon="tag"></pl-icon>

                    <div>${tag}</div> 

                </li>
            `
            )}

        </ul>
`;
    }
}
