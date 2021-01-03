import { translate as $l } from "@padloc/locale/src/translate";
import { PlanType, SubscriptionStatus } from "@padloc/core/src/billing";
import { ErrorCode } from "@padloc/core/src/error";
import { Vault } from "@padloc/core/src/vault";
import { app } from "../globals";
import { shared, mixins } from "../styles";
import { dialog, alert } from "../lib/dialog";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { BaseElement, element, property, html, css } from "./base";
import "./logo";
import "./spinner";
import { ReportErrorsDialog } from "./report-errors-dialog";
import "./button";
import "./drawer";
import "./drawer";
import "./scroller";
import "./list";

@element("pl-menu")
export class Menu extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^([^\/]+)(?:\/([^\/]+))?/;

    @property()
    selected: string;

    @dialog("pl-report-errors-dialog")
    private _reportErrorsDialog: ReportErrorsDialog;

    @property()
    private _expanded = new Set<string>();

    handleRoute(
        [page, id]: [string, string],
        { vault, tag, favorites, recent, attachments, host }: { [prop: string]: string }
    ) {
        switch (page) {
            case "items":
                this.selected = vault
                    ? `vault/${vault}`
                    : tag
                    ? `tag/${tag}`
                    : favorites
                    ? "favorites"
                    : recent
                    ? "recent"
                    : attachments
                    ? "attachments"
                    : host
                    ? "host"
                    : "items";
                break;
            case "orgs":
                this.selected = `orgs/${id}`;
                break;
            default:
                this.selected = page;
        }
    }

    private _goTo(path: string, params?: any, e?: Event) {
        this.dispatch("toggle-menu");
        this.go(path, params);
        e && e.stopPropagation();
    }

    private async _lock() {
        this.dispatch("toggle-menu");
        await app.lock();
        this.go("unlock");
    }

    private _getPremium(e?: MouseEvent) {
        e && e.stopPropagation();
        this.dispatch("get-premium");
        this.dispatch("toggle-menu");
    }

    private _reportErrors() {
        this._reportErrorsDialog.show();
    }

    private _displayVaultError(vault: Vault, e?: Event) {
        e && e.stopPropagation();

        const error = vault.error!;

        switch (error.code) {
            case ErrorCode.UNSUPPORTED_VERSION:
                alert(
                    $l(
                        "A newer version of Padloc is required to synchronize this vault. Please update to the latest version now!"
                    ),
                    {
                        title: "Update Required",
                        type: "warning",
                    }
                );
                return;
            case ErrorCode.MISSING_ACCESS:
                alert($l("This vault could not be synchronized because you no longer have access to it."), {
                    title: "Sync Failed",
                    type: "warning",
                });
                return;
            default:
                alert(
                    error.message ||
                        $l(
                            "An unknown error occured while synchronizing this vault. If this problem persists please contact customer support."
                        ),
                    {
                        title: "Sync Failed",
                        type: "warning",
                    }
                );
                return;
        }
    }

    private _toggleExpanded(val: string) {
        this._expanded.has(val) ? this._expanded.delete(val) : this._expanded.add(val);
        this.requestUpdate();
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                position: relative;
                background: var(--black-gradient);
                --color-foreground: var(--color-white);
                color: var(--color-foreground);
                text-shadow: var(--text-shadow);
            }

            .menu-item {
                padding: var(--spacing);
                display: flex;
                align-items: center;
                margin: 0 var(--spacing);
                border-radius: 0.5em;
            }

            .menu-item:not(:last-child) {
                margin-bottom: calc(0.5 * var(--spacing));
            }

            .menu-item > :not(:last-child) {
                margin-right: var(--spacing);
            }

            ${mixins.click(".menu-item")}
            ${mixins.hover(".menu-item")}

            .menu-item[aria-selected] {
                background: var(--color-highlight);
                color: var(--color-white);
            }

            .menu-item.favorites {
                --color-highlight: var(--color-red);
            }

            .menu-item .dropdown-icon {
                transition: transform 0.3s;
            }

            .menu-item[aria-expanded="false"] .dropdown-icon {
                transform: rotate(-90deg);
            }

            .sub-list {
                display: block;
                padding-left: calc(2 * var(--spacing));
            }

            pl-logo {
                height: 2em;
                margin: 1em auto 0 auto;
            }

            .syncing {
                width: 20px;
                height: 20px;
                margin: 5px;
            }

            .get-premium {
                background: var(--color-negative);
            }

            .separator {
                height: 2px;
                background: var(--color-shade-2);
                border-radius: 100%;
                margin: 8px 16px;
            }

            .errors-button {
                background: var(--color-negative);
                padding: 0;
                padding-right: 8px;
                display: flex;
                align-items: center;
                font-weight: bold;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                pl-logo {
                    margin-top: max(env(safe-area-inset-top), 15px);
                }

                .footer {
                    padding-bottom: max(calc(env(safe-area-inset-bottom) / 3), 5px);
                    padding-left: max(calc(env(safe-area-inset-bottom) / 3), 5px);
                }
            }
        `,
    ];

    render() {
        const mainVault = app.mainVault;
        const account = app.account;

        if (!mainVault || !account) {
            return html``;
        }

        const itemsQuota = app.getItemsQuota();

        const tags = app.state.tags;

        const count = app.count;

        const showSettingsWarning =
            app.billingEnabled &&
            account.billing &&
            (!account.billing.subscription || account.billing.subscription.status === SubscriptionStatus.Inactive);

        const showUpgradeButton =
            app.billingEnabled &&
            (!account.billing ||
                !account.billing.subscription ||
                account.billing.subscription.plan.type === PlanType.Free) &&
            itemsQuota !== -1;

        return html`
            <div class="padded">
                <pl-logo reveal></pl-logo>

                <div class="subtle text-centering">v${process.env.PL_VERSION}</div>

                <div class="spacer"></div>
            </div>

            <pl-scroller class="stretch">
                <pl-list itemSelector=".menu-item">
                    <div
                        class="menu-item"
                        role="link"
                        @click=${() => this._goTo("items", {})}
                        ?aria-selected=${this.selected === "items"}
                    >
                        <pl-icon icon="vaults"></pl-icon>
                        <div class="stretch">${$l("All Vaults")}</div>
                        <div class="small subtle">${count.total}</div>
                    </div>

                    <div
                        class="menu-item"
                        role="link"
                        @click=${() => this._goTo("items", { host: true })}
                        ?aria-selected=${this.selected === "host"}
                        ?hidden=${!count.currentHost}
                    >
                        <pl-icon icon="web"></pl-icon>

                        <div class="stretch ellipsis">${this.app.state.currentHost}</div>

                        <div class="small subtle">${count.currentHost}</div>
                    </div>

                    <div
                        class="menu-item"
                        role="link"
                        class="transparent horizontal center-aligning text-left-aligning spacing layout"
                        @click=${() => this._goTo("items", { recent: true })}
                        ?aria-selected=${this.selected === "recent"}
                    >
                        <pl-icon icon="time"></pl-icon>

                        <div class="stretch">${$l("Recently Used")}</div>

                        <div class="small subtle">${count.recent}</div>
                    </div>

                    <div
                        class="menu-item favorites"
                        role="link"
                        @click=${() => this._goTo("items", { favorites: true })}
                        ?aria-selected=${this.selected === "favorites"}
                    >
                        <pl-icon icon="favorite"></pl-icon>

                        <div class="stretch">${$l("Favorites")}</div>

                        <div class="small subtle">${count.favorites}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("items", { attachments: true })}
                        ?aria-selected=${this.selected === "attachments"}
                    >
                        <pl-icon icon="attachment"></pl-icon>

                        <div class="stretch">${$l("Attachments")}</div>

                        <div class="small subtle">${count.attachments}</div>
                    </div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("items", { vault: mainVault.id })}
                        ?aria-selected=${this.selected === `vault/${mainVault.id}`}
                    >
                        <pl-icon icon="vault"></pl-icon>
                        <div class="stretch">${$l("My Vault")}</div>
                        ${mainVault.error
                            ? html`
                                  <pl-button
                                      class="small negative borderless skinny negatively-margined"
                                      @click=${(e: Event) => this._displayVaultError(mainVault, e)}
                                  >
                                      <pl-icon icon="error"></pl-icon>
                                  </pl-button>
                              `
                            : itemsQuota !== -1
                            ? html`
                                  <pl-button
                                      class="small negative borderless skinny negatively-margined"
                                      @click=${this._getPremium}
                                  >
                                      ${mainVault.items.size} / ${itemsQuota}
                                  </pl-button>
                              `
                            : html` <div class="small subtle">${mainVault.items.size}</div> `}
                    </div>

                    ${app.orgs.map((org) => {
                        const vaults = app.vaults.filter((v) => v.org && v.org.id === org.id);

                        return html`
                            <div>
                                <div
                                    class="menu-item"
                                    @click=${() => this._toggleExpanded(`org_${org.id}`)}
                                    aria-expanded=${this._expanded.has(`org_${org.id}`)}
                                >
                                    <pl-icon icon="vaults"></pl-icon>
                                    <div class="stretch ellipsis">${org.name}</div>
                                    <pl-button
                                        class="small transparent round slim negatively-margined reveal-on-hover"
                                        @click=${(e: Event) => this._goTo(`orgs/${org.id}`, undefined, e)}
                                    >
                                        <pl-icon icon="settings"></pl-icon>
                                    </pl-button>
                                    <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                                </div>

                                <pl-drawer .collapsed=${!this._expanded.has(`org_${org.id}`)}>
                                    <pl-list class="sub-list">
                                        ${vaults.map((vault) => {
                                            return html`
                                                <div
                                                    class="menu-item"
                                                    @click=${() => this._goTo("items", { vault: vault.id })}
                                                    ?aria-selected=${this.selected === `vault/${vault.id}`}
                                                >
                                                    <pl-icon icon="vault"></pl-icon>
                                                    <div class="stretch ellipsis">${vault.name}</div>

                                                    ${vault.error
                                                        ? html`
                                                              <pl-button
                                                                  class="small negative borderless skinny negatively-margined"
                                                                  @click=${(e: Event) =>
                                                                      this._displayVaultError(vault, e)}
                                                              >
                                                                  <pl-icon icon="error"></pl-icon>
                                                              </pl-button>
                                                          `
                                                        : html` <div class="small subtle">${vault.items.size}</div> `}
                                                </div>
                                            `;
                                        })}

                                        <div
                                            class="menu-item subtle"
                                            @click=${() => this._goTo(`orgs/${org.id}/vaults/new`)}
                                        >
                                            <pl-icon icon="add"></pl-icon>

                                            <div class="stretch">${$l("New Vault")}</div>
                                        </div>
                                    </pl-list>
                                </pl-drawer>
                            </div>
                        `;
                    })}

                    <div>
                        <div
                            class="menu-item"
                            @click=${() => this._toggleExpanded("tags")}
                            aria-expanded=${this._expanded.has("tags")}
                        >
                            <pl-icon icon="tags"></pl-icon>
                            <div class="stretch ellipsis">${$l("Tags")}</div>
                            <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                        </div>

                        <pl-drawer .collapsed=${!this._expanded.has("tags")}>
                            <pl-list class="sub-list">
                                ${tags.map(
                                    ([tag, count]) => html`
                                        <div
                                            class="menu-item"
                                            @click=${() => this._goTo("items", { tag })}
                                            ?aria-selected=${this.selected === `tag/${tag}`}
                                        >
                                            <pl-icon icon="tag"></pl-icon>

                                            <div class="stretch ellipsis">${tag}</div>

                                            <div class="small subtle">${count}</div>
                                        </div>
                                    `
                                )}
                            </pl-list>
                        </pl-drawer>
                    </div>

                    <div class="separator"></div>

                    <div>
                        <div
                            class="menu-item"
                            @click=${() => this._toggleExpanded("orgs")}
                            aria-expanded=${this._expanded.has("orgs")}
                        >
                            <pl-icon icon="hirarchy"></pl-icon>
                            <div class="stretch ellipsis">${$l("Orgs & Teams")}</div>
                            <pl-icon icon="chevron-down" class="small subtle dropdown-icon"></pl-icon>
                        </div>

                        <pl-drawer .collapsed=${!this._expanded.has("orgs")}>
                            <pl-list class="sub-list">
                                ${app.orgs.map(
                                    (org) => html`
                                        <div
                                            class="menu-item"
                                            ?aria-selected=${this.selected === `orgs/${org.id}`}
                                            @click=${() => this._goTo(`orgs/${org.id}`)}
                                        >
                                            <pl-icon icon="org"></pl-icon>

                                            <div class="stretch ellipsis">${org.name}</div>

                                            <pl-button
                                                class="small negative borderless skinny negatively-margined"
                                                ?hidden=${!org.frozen}
                                            >
                                                <pl-icon icon="error"></pl-icon>
                                            </pl-button>
                                        </div>
                                    `
                                )}

                                <div class="menu-item subtle" @click=${() => this.dispatch("create-org")}>
                                    <pl-icon icon="add"></pl-icon>

                                    <div class="stretch">${$l("New Organization")}</div>
                                </div>
                            </pl-list>
                        </pl-drawer>
                    </div>

                    <div class="separator"></div>

                    <div
                        class="menu-item"
                        @click=${() => this._goTo("settings")}
                        ?aria-selected=${this.selected === "settings"}
                    >
                        <pl-icon icon="settings"></pl-icon>

                        <div class="stretch">${$l("Settings")}</div>

                        <pl-button
                            class="small negative borderless skinny negatively-margined"
                            ?hidden=${!showSettingsWarning}
                        >
                            <pl-icon icon="error"></pl-icon>
                        </pl-button>
                    </div>

                    <div class="get-premium menu-item" @click=${this._getPremium} ?hidden=${!showUpgradeButton}>
                        <pl-icon icon="favorite"></pl-icon>

                        <div class="stretch">${$l("Get Premium")}</div>
                    </div>
                </pl-list>
            </pl-scroller>

            <div class="small padded center-aligning horizontal layout">
                <pl-button class="transparent round" @click=${this._lock}>
                    <pl-icon icon="lock"></pl-icon>
                </pl-button>
                <pl-button class="transparent round" @click=${() => app.synchronize()}>
                    <pl-icon icon="refresh"></pl-icon>
                </pl-button>
                <div class="stretch"></div>
                <pl-spinner .active=${app.state.syncing} class="syncing"></pl-spinner>
                <pl-button
                    class="negative borderless slim"
                    @click=${this._reportErrors}
                    ?hidden=${!app.state._errors.length}
                >
                    <pl-icon icon="error" class="small right-margined"></pl-icon>
                    <div>${app.state._errors.length}</div>
                </pl-button>
            </div>
        `;
    }
}
