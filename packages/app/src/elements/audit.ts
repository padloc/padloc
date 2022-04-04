import { translate as $l } from "@padloc/locale/src/translate";
import { AuditResultType } from "@padloc/core/src/item";
import { customElement, state, queryAll } from "lit/decorators.js";
import { css, html } from "lit";

import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { AuditMixin } from "../mixins/audit";
import { animateElement } from "../lib/animation";
import { View } from "./view";
import { ListItem } from "./items-list";

@customElement("pl-audit")
export class Audit extends AuditMixin(StateMixin(Routing(View))) {
    readonly routePattern = /^audit/;

    @state()
    private _reusedPasswords: ListItem[] = [];

    @state()
    private _weakPasswords: ListItem[] = [];

    @state()
    private _compromisedPasswords: ListItem[] = [];

    @queryAll("pl-audit-list-item")
    private _countElements: HTMLDivElement[];

    handleRoute() {
        this.audit();
    }

    shouldUpdate() {
        return !!app.account;
    }

    static styles = [
        ...View.styles,
        css`
            .counts {
                display: grid;
                grid-gap: 1em;
                margin: 1em;
                grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
            }

            @media (max-width: 700px) {
                .counts {
                    grid-template-columns: repeat(auto-fit, minmax(15em, 1fr));
                }
            }
        `,
    ];

    render() {
        const { _reusedPasswords, _weakPasswords, _compromisedPasswords } = this;

        return html`
            <div class="fullbleed vertical layout">
                <header class="padded spacing center-aligning horizontal layout">
                    <pl-button
                        class="transparent skinny menu-button header-title"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                    >
                        <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                            <pl-icon icon="shield-check"></pl-icon>
                            <div class="stretch ellipsis">${$l("Security Audit")}</div>
                        </div>
                    </pl-button>
                </header>
                <div class="layout padded">
                    <div class="vertical spacing stretch">
                        <pl-scroller class="stretch">
                            <div class="counts">
                                ${this._renderSection(_reusedPasswords, $l("Reused Passwords"), {
                                    audit: AuditResultType.ReusedPassword,
                                })}
                                ${this._renderSection(_weakPasswords, $l("Weak Passwords"), {
                                    audit: AuditResultType.WeakPassword,
                                })}
                                ${this._renderSection(_compromisedPasswords, $l("Compromised Passwords"), {
                                    audit: AuditResultType.CompromisedPassword,
                                })}
                            </div>
                        </pl-scroller>
                    </div>
                </div>
            </div>
        `;
    }

    async audit() {
        const { vaults } = this.state;

        const { reusedPasswords, weakPasswords, compromisedPasswords } = await this.auditVaults(vaults);

        // This makes the UI update
        this._reusedPasswords = reusedPasswords;
        this._weakPasswords = weakPasswords;
        this._compromisedPasswords = compromisedPasswords;

        this._countElements.forEach((countElement) => {
            animateElement(countElement, { animation: "bounce" });
        });
    }

    private _renderSection(listItems: ListItem[], label: string, routeParams: any) {
        return html`
            <section class="box count" ?hidden=${listItems.length === 0}>
                <h2 class="uppercase bg-dark border-bottom semibold center-aligning spacing horizontal layout">
                    <div></div>
                    <div>${label}</div>
                    <div class="tiny bold tag">${listItems.length}</div>
                    <div class="stretch"></div>
                </h2>
                <pl-list>
                    ${listItems.slice(0, 5).map(
                        (listItem) => html`
                            <div class="list-item hover click" @click=${() => this.go(`items/${listItem.item.id}`)}>
                                <pl-vault-item-list-item
                                    .item=${listItem.item}
                                    .vault=${listItem.vault}
                                    class="stretch collapse"
                                ></pl-vault-item-list-item>
                            </div>
                        `
                    )}
                </pl-list>
                <pl-button
                    class="slim margined transparent"
                    @click=${() => this.go("items", routeParams)}
                    ?hidden=${listItems.length < 6}
                >
                    <div>${$l("Show All")}</div>
                    <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                </pl-button>
            </section>
        `;
    }
}
