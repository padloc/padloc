import { translate as $l } from "@padloc/locale/src/translate";
import { customElement, queryAll, property, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";

import { ListItem } from "./items-list";
import { animateElement } from "../lib/animation";
import { shared } from "../styles";
import { Routing } from "../mixins/routing";
import { StateMixin } from "../mixins/state";

// TODO: Improve UI
// TODO: Improve UX
// TODO: Use translations

@customElement("pl-audit-list-item")
export class AuditListItem extends Routing(LitElement) {
    @state()
    listItems: ListItem[];

    @property({ attribute: false })
    label: string;

    @property({ attribute: false })
    routeParams: any;

    static styles = [shared, css``];

    render() {
        const { listItems, label, routeParams } = this;

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

@customElement("pl-audit")
export class Audit extends StateMixin(LitElement) {
    @state()
    private _reusedPasswords: ListItem[] = [];

    @state()
    private _weakPasswords: ListItem[] = [];

    @state()
    private _compromisedPasswords: ListItem[] = [];

    @queryAll("pl-audit-list-item")
    private _countElements: HTMLDivElement[];

    static styles = [
        shared,
        css`
            :host {
                display: block;
            }

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

        // TODO: Remove this
        console.log("======== rendering!");
        console.log(
            JSON.stringify({
                reusedPasswordsCount: _reusedPasswords.length,
                weakPasswordsCount: _weakPasswords.length,
                compromisedPasswordsCount: _compromisedPasswords.length,
            })
        );

        return html`
            <div class="padded layout">
                <div class="vertical spacing">
                    <h3>
                        Here you can see some counts for passwords you should change, as they might be easier to be
                        easily guessed.
                    </h3>
                    <p class="subtle">Click a count to view the affected items.</p>
                    <div class="counts">
                        <pl-audit-list-item
                            .listItems=${_reusedPasswords}
                            .label=${$l("Reused Passwords")}
                            .routeParams=${{ auditReused: "true" }}
                        ></pl-audit-list-item>
                        <pl-audit-list-item
                            .listItems=${_weakPasswords}
                            .label=${$l("Weak Passwords")}
                            .routeParams=${{ auditWeak: "true" }}
                        ></pl-audit-list-item>
                        <pl-audit-list-item
                            .listItems=${_compromisedPasswords}
                            .label=${$l("Compromised Passwords")}
                            .routeParams=${{ auditCompromised: "true" }}
                        ></pl-audit-list-item>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this.audit());
    }

    async audit() {
        this._reusedPasswords = [];
        this._weakPasswords = [];
        this._compromisedPasswords = [];

        const { vaults } = this.state;

        // This prevents the same item from being considered more than once for different sections/audits
        const checkedItemIds: Set<string> = new Set();

        for (const vault of vaults) {
            for (const item of vault.items) {
                if (checkedItemIds.has(item.id)) {
                    continue;
                }

                // TODO: Skip/ignore if the item doesn't have a password field

                // TODO: Actually check if the audit is correct, instead of this random calculation
                const randomNumber = Math.floor(Math.random() * 2);

                if (randomNumber % 5 === 0) {
                    this._reusedPasswords.push({
                        vault,
                        item,
                    });

                    checkedItemIds.add(item.id);
                } else if (randomNumber % 5 === 1) {
                    this._weakPasswords.push({
                        vault,
                        item,
                    });

                    checkedItemIds.add(item.id);
                } else if (randomNumber % 5 === 2) {
                    this._compromisedPasswords.push({
                        vault,
                        item,
                    });

                    checkedItemIds.add(item.id);
                }

                // TODO: Store + save (+ sync) last audit date and audit match booleans in items
            }
        }

        this._countElements.forEach((countElement) => {
            animateElement(countElement, { animation: "bounce" });
        });

        // TODO: This doesn't work, and shouldn't be necessary
        this.stateChanged();

        // TODO: Remove this
        console.log("======== audit finished!");
        console.log(
            JSON.stringify({
                reusedPasswordsCount: this._reusedPasswords.length,
                weakPasswordsCount: this._weakPasswords.length,
                compromisedPasswordsCount: this._compromisedPasswords.length,
            })
        );
    }
}
