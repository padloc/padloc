import { Org } from "@padloc/core/lib/org.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { app } from "../init.js";
import { shared } from "../styles";
import { router } from "../init";
import { prompt } from "../dialog";
import { BaseElement, element, listen, property, html } from "./base.js";

@element("pl-org-list")
export class OrgList extends BaseElement {
    @property()
    selected: string = "";

    @listen("unlock", app)
    @listen("org-created", app)
    @listen("org-changed", app)
    _refresh() {
        this.requestUpdate();
    }

    private _select(org: Org) {
        router.go(`orgs/${org.id}`);
    }

    private async _createOrg() {
        await prompt($l("Please choose a org name!"), {
            title: $l("Create Org"),
            label: $l("Org Name"),
            confirmLabel: $l("Create"),
            validate: async (name: string) => {
                if (!name) {
                    throw $l("Please enter a org name!");
                }
                await app.createOrg(name);
                return name;
            }
        });
    }

    render() {
        const orgs = app.orgs;

        return html`
            ${shared}

            <style>
                :host {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    background: var(--color-quaternary);
                }

                li {
                    border-bottom: solid 1px #ddd;
                    margin: 6px 0;
                    background: var(--color-tertiary);
                    border-bottom: solid 1px #ddd;
                }

                li:not([selected]):hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                li[selected] {
                    background: #eee;
                }

                li[selected] {
                    background: #eee;
                }

                pl-org-list-item {
                    border-top: solid 1px #ddd;
                }

                .suborg {
                    margin-top: -10px;
                    margin-left: 30px;
                    padding-left: 0;
                    height: 50px;
                }

                .suborg pl-icon {
                    font-size: 80%;
                }

                .show-archived {
                    margin: 5px 10px;
                    border-radius: var(--border-radius);
                    background: white;
                    width: calc(100% - 20px);
                    border: solid 1px #ddd;
                }
            </style>

            <header>
                <pl-icon icon="menu" class="tap menu-button" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title">${$l("Orgs")}</div>

                <pl-icon icon=""></pl-icon>
            </header>

            <main>
                <ul>
                    ${orgs.map(
                        org => html`
                            <li ?selected=${org.id === this.selected} @click=${() => this._select(org)}>
                                ${org.name}
                            </li>
                        `
                    )}
                </ul>

                <div class="empty-placeholder" ?hidden=${!!orgs.length}>
                    <pl-icon icon="orgs"></pl-icon>

                    <div>${$l("You don't have any organizations yet.")}</div>
                </div>

                <div class="fabs">
                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => this._createOrg()}></pl-icon>
                </div>
            </main>
        `;
    }
}
