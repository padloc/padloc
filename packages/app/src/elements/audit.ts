import { translate as $l } from "@padloc/locale/src/translate";
import { AuditResultType, VaultItem } from "@padloc/core/src/item";
import { customElement, query } from "lit/decorators.js";
import { css, html } from "lit";
import { app } from "../globals";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { View } from "./view";
import { descriptionForAudit, iconForAudit, titleTextForAudit } from "../lib/audit";
import { Vault } from "@padloc/core/src/vault";
import "./popover";
import { Select } from "./select";
import { Org } from "@padloc/core/src/org";
// import { checkFeatureDisabled } from "../lib/provisioning";

@customElement("pl-audit")
export class Audit extends StateMixin(Routing(View)) {
    readonly routePattern = /^audit/;

    @query("pl-select")
    private _select: Select<Org | Vault | null>;

    private get _selectOptions() {
        return [
            { label: "All Items", value: null },
            { label: "My Vault", value: app.mainVault },
            ...app.orgs.map((org) => ({ label: org.name, value: org })),
        ];
    }

    private get _items() {
        const filterBy = this._select?.value;

        if (filterBy instanceof Vault) {
            return app.auditedItems.filter((item) => item.vault.id === filterBy.id);
        } else if (filterBy instanceof Org) {
            return app.auditedItems.filter((item) => item.vault.org?.id === filterBy.id);
        } else {
            return app.auditedItems;
        }
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
        const items = this._items;
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
                            <div class="stretch ellipsis">${$l("Security Check")}</div>
                        </div>
                    </pl-button>

                    <div class="stretch"></div>
                    <pl-select
                        class="slim"
                        .options=${this._selectOptions}
                        @change=${() => this.requestUpdate()}
                    ></pl-select>
                </header>
                <div class="layout padded">
                    <div class="vertical spacing stretch">
                        <pl-scroller class="stretch">
                            <div class="counts">
                                ${app.settings.securityCheckWeak
                                    ? this._renderSection(items, AuditResultType.WeakPassword)
                                    : ""}
                                ${app.settings.securityCheckReused
                                    ? this._renderSection(items, AuditResultType.ReusedPassword)
                                    : ""}
                                ${app.settings.securityCheckCompromised
                                    ? this._renderSection(items, AuditResultType.CompromisedPassword)
                                    : ""}
                            </div>
                        </pl-scroller>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderSection(listItems: { item: VaultItem; vault: Vault }[], type: AuditResultType) {
        listItems = listItems.filter(({ item }) => item.auditResults.some((res) => res.type === type));
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
