import { localize as $l } from "@padloc/core/lib/locale.js";
import { StateMixin } from "../mixins/state.js";
import { shared } from "../styles";
import { app, router } from "../init.js";
import { element, html, css } from "./base.js";
import { View } from "./view.js";
import "./icon.js";

@element("pl-orgs-list")
export class OrgsList extends StateMixin(View) {
    static styles = [
        shared,
        css`
            :host {
                background: var(--color-quaternary);
            }

            .orgs {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                grid-gap: 12px;
                margin: 12px;
            }

            .orgs > * {
                margin: 0;
            }

            .org {
                padding: 16px;
                display: flex;
                align-items: center;
            }

            .org-icon {
                font-size: 120%;
                margin-right: 12px;
                background: #eee;
                border: solid 1px #ddd;
                width: 50px;
                height: 50px;
            }

            .org .tags {
                margin: 4px 0;
            }

            .org-name {
                font-weight: bold;
                margin-bottom: 4px;
                font-size: 120%;
                font-weight: 600;
            }

            .org-info {
                flex: 1;
                width: 0;
            }

            .new-org {
                background: none;
                border: dashed 1px;
                font-weight: bold;
            }
        `
    ];

    render() {
        return html`
            <header>
                <pl-icon class="tap menu-button" icon="menu" @click=${() => this.dispatch("toggle-menu")}></pl-icon>

                <div class="title flex">${$l("Orgs & Teams")}</div>

                <pl-icon></pl-icon>
            </header>

            <main>
                <div class="orgs">
                    ${app.orgs.map(
                        org => html`
                            <div class="org item tap" @click=${() => router.go(`orgs/${org.id}`)}>
                                <pl-icon class="org-icon" icon="org"></pl-icon>

                                <div class="org-info">
                                    <div class="org-name ellipsis">${org.name}</div>

                                    <div class="tags small">
                                        <div class="tag">
                                            <pl-icon icon="org"></pl-icon>

                                            <div>${org.members.length}</div>
                                        </div>

                                        <div class="tag">
                                            <pl-icon icon="group"></pl-icon>

                                            <div>${org.groups.length}</div>
                                        </div>

                                        <div class="tag">
                                            <pl-icon icon="vault"></pl-icon>

                                            <div>${org.vaults.length}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `
                    )}
                </div>

                <div class="fabs">
                    <div class="flex"></div>

                    <pl-icon icon="add" class="tap fab" @click=${() => this.dispatch("create-org")}></pl-icon>
                </div>
            </main>
        `;
    }
}
