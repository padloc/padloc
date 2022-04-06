import { translate as $l } from "@padloc/locale/src/translate";
import { AuditResultType, VaultItem } from "@padloc/core/src/item";
import { customElement } from "lit/decorators.js";
import { css, html } from "lit";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { View } from "./view";
import { descriptionForAudit, iconForAudit, titleTextForAudit } from "../lib/audit";
import { Vault } from "@padloc/core/src/vault";

@customElement("pl-audit")
export class Audit extends StateMixin(Routing(View)) {
    readonly routePattern = /^audit/;

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
        let items = app.auditedItems;
        return html`
            <div class="fullbleed vertical layout">
                <header class="padded spacing center-aligning horizontal layout">
                    <pl-button
                        class="transparent skinny menu-button header-title"
                        @click=${() =>
                            this.dispatchEvent(new CustomEvent("toggle-menu", { composed: true, bubbles: true }))}
                    >
                        <div class="half-margined horizontal spacing center-aligning layout text-left-aligning">
                            <pl-icon icon="audit-pass"></pl-icon>
                            <div class="stretch ellipsis">${$l("Security Audit")}</div>
                        </div>
                    </pl-button>
                </header>
                <div class="layout padded">
                    <div class="vertical spacing stretch">
                        <pl-scroller class="stretch">
                            <div class="counts">
                                ${Object.values(AuditResultType).map((type) =>
                                    this._renderSection(
                                        items.filter(({ item }) => item.auditResults.some((res) => res.type === type)),
                                        type
                                    )
                                )}
                            </div>
                        </pl-scroller>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderSection(listItems: { item: VaultItem; vault: Vault }[], type: AuditResultType) {
        return html`
            <section class="box count">
                <h2 class="bg-dark border-bottom center-aligning spacing horizontal layout">
                    <pl-icon icon="${iconForAudit(type)}" class="left-margined"></pl-icon>
                    <div class="uppercase semibold">${titleTextForAudit(type)}</div>
                    <div class="small bold subtle">${listItems.length}</div>
                    <div class="stretch"></div>
                    <pl-button class="subtle skinny transparent half-margined">
                        <pl-icon icon="info-round"></pl-icon>
                    </pl-button>
                    <pl-popover class="small double-padded max-width-20em"> ${descriptionForAudit(type)} </pl-popover>
                </h2>
                ${listItems.length
                    ? html`
                          <pl-list>
                              ${listItems.slice(0, 5).map(
                                  (listItem) => html`
                                      <div
                                          class="list-item hover click"
                                          @click=${() => this.go(`items/${listItem.item.id}`)}
                                      >
                                          <pl-vault-item-list-item
                                              .item=${listItem.item}
                                              .vault=${listItem.vault}
                                              class="none-interactive"
                                          ></pl-vault-item-list-item>
                                      </div>
                                  `
                              )}
                          </pl-list>
                      `
                    : html`
                          <div class="small double-padded subtle text-centering">
                              <pl-icon icon="audit-pass" class="inline"></pl-icon> ${$l("Nothing Found")}
                          </div>
                      `}
                <pl-button
                    class="slim margined transparent"
                    @click=${() => this.go("items", { audit: type })}
                    ?hidden=${listItems.length < 6}
                >
                    <div>${$l("Show All")}</div>
                    <pl-icon icon="arrow-right" class="small left-margined"></pl-icon>
                </pl-button>
            </section>
        `;
    }
}
