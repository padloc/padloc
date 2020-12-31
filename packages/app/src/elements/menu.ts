import { translate as $l } from "@padloc/locale/src/translate";
import { PlanType, SubscriptionStatus } from "@padloc/core/src/billing";
import { ErrorCode } from "@padloc/core/src/error";
import { Vault } from "@padloc/core/src/vault";
import { app } from "../globals";
import { shared } from "../styles";
import { dialog, alert } from "../lib/dialog";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { BaseElement, element, property, html, css } from "./base";
import "./logo";
import "./spinner";
import { ReportErrorsDialog } from "./report-errors-dialog";
import "./button";
import { Drawer } from "./drawer";
import "./drawer";
import "./scroller";

@element("pl-menu")
export class Menu extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^([^\/]+)(?:\/([^\/]+))?/;

    @property()
    selected: string;

    @dialog("pl-report-errors-dialog")
    _reportErrorsDialog: ReportErrorsDialog;

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

    private _goTo(path: string, params?: any) {
        this.dispatch("toggle-menu");
        this.go(path, params);
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

    private _toggleDrawer(e: Event) {
        const drawer = (e.currentTarget as HTMLElement).nextElementSibling! as Drawer;
        drawer.collapsed = !drawer.collapsed;
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                font-size: var(--font-size-small);
                background: var(--black-gradient);
                --color-foreground: var(--color-white);
                color: var(--color-foreground);
                text-shadow: var(--text-shadow);
            }

            pl-scroller {
                flex: 1;
                height: 0;
            }

            li {
                margin: 0.1em 0.5em;
            }

            .sub-list li {
                margin-right: 0;
                margin-left: 1em;
            }

            pl-button[selected] {
                --button-background: var(--color-highlight);
                --button-foreground: var(--color-white);
            }

            .manage-button {
                margin: -0.6em 0;
            }

            pl-button:not(:hover) .manage-button {
                display: none;
            }

            .favorites {
                --color-highlight: var(--color-red);
            }

            .vault {
                --color-highlight: var(--color-blue);
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

            .subsection-header {
                margin: 12px 8px 6px 26px;
                opacity: 0.7;
                font-size: var(--font-size-tiny);
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

            <pl-scroller>
                <nav>
                    <ul>
                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", {})}
                                ?selected=${this.selected === "items"}
                            >
                                <pl-icon icon="vaults"></pl-icon>
                                <div class="stretch">${$l("All Vaults")}</div>
                                <div class="small subtle">${count.total}</div>
                            </pl-button>
                        </li>

                        <li class="favorites" ?hidden=${!count.currentHost}>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", { host: true })}
                                ?selected=${this.selected === "host"}
                            >
                                <pl-icon icon="web"></pl-icon>

                                <div class="stretch ellipsis">${this.app.state.currentHost}</div>

                                <div class="small subtle">${count.currentHost}</div>
                            </pl-button>
                        </li>

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", { recent: true })}
                                ?selected=${this.selected === "recent"}
                            >
                                <pl-icon icon="time"></pl-icon>

                                <div class="stretch">${$l("Recently Used")}</div>

                                <div class="small subtle">${count.recent}</div>
                            </pl-button>
                        </li>

                        <li class="favorites">
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", { favorites: true })}
                                ?selected=${this.selected === "favorites"}
                            >
                                <pl-icon icon="favorite"></pl-icon>

                                <div class="stretch">${$l("Favorites")}</div>

                                <div class="small subtle">${count.favorites}</div>
                            </pl-button>
                        </li>

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", { attachments: true })}
                                ?selected=${this.selected === "attachments"}
                            >
                                <pl-icon icon="attachment"></pl-icon>

                                <div class="stretch">${$l("Attachments")}</div>

                                <div class="small subtle">${count.attachments}</div>
                            </pl-button>
                        </li>

                        <li class="vault">
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("items", { vault: mainVault.id })}
                                ?selected=${this.selected === `vault/${mainVault.id}`}
                            >
                                <pl-icon icon="vault"></pl-icon>
                                <div class="stretch">${$l("My Vault")}</div>
                                ${mainVault.error
                                    ? html`
                                          <div
                                              class="small subtle tap warning"
                                              @click=${(e: Event) => this._displayVaultError(mainVault, e)}
                                          >
                                              <pl-icon icon="error"></pl-icon>
                                          </div>
                                      `
                                    : itemsQuota !== -1
                                    ? html`
                                          <div class="small subtle tap warning" @click=${this._getPremium}>
                                              ${mainVault.items.size} / ${itemsQuota}
                                          </div>
                                      `
                                    : html` <div class="small subtle">${mainVault.items.size}</div> `}
                            </pl-button>
                        </li>

                        ${app.orgs.map((org) => {
                            const vaults = app.vaults.filter((v) => v.org && v.org.id === org.id);

                            return html`
                                <li>
                                    <pl-button
                                        class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                        @click=${this._toggleDrawer}
                                    >
                                        <pl-icon icon="org"></pl-icon>
                                        <div class="stretch ellipsis">${org.name}</div>
                                        <pl-button class="small transparent round manage-button">
                                            <pl-icon icon="settings"></pl-icon>
                                        </pl-button>
                                        <pl-icon icon="chevron-down" class="small subtle"></pl-icon>
                                    </pl-button>

                                    <pl-drawer>
                                        <ul class="sub-list">
                                            ${vaults.map((vault) => {
                                                return html`
                                                    <li class="vault">
                                                        <pl-button
                                                            class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                                            @click=${() => this._goTo("items", { vault: vault.id })}
                                                            ?selected=${this.selected === `vault/${vault.id}`}
                                                        >
                                                            <pl-icon icon="vault"></pl-icon>
                                                            <div class="stretch ellipsis">${vault.name}</div>

                                                            ${vault.error
                                                                ? html`
                                                                      <div
                                                                          class="small subtle tap warning"
                                                                          @click=${(e: Event) =>
                                                                              this._displayVaultError(vault, e)}
                                                                      >
                                                                          <pl-icon icon="error"></pl-icon>
                                                                      </div>
                                                                  `
                                                                : html`
                                                                      <div class="small subtle">
                                                                          ${vault.items.size}
                                                                      </div>
                                                                  `}
                                                        </pl-button>
                                                    </li>
                                                `;
                                            })}

                                            <li>
                                                <pl-button
                                                    class="transparent horizontal center-aligning text-left-aligning spacing layout subtle"
                                                    @click=${() => this.dispatch("create-vault")}
                                                >
                                                    <pl-icon icon="add"></pl-icon>

                                                    <div class="stretch">${$l("New Vault")}</div>
                                                </pl-button>
                                            </li>
                                        </ul>
                                    </pl-drawer>
                                </li>
                            `;
                        })}

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${this._toggleDrawer}
                            >
                                <pl-icon icon="tags"></pl-icon>
                                <div class="stretch ellipsis">${$l("Tags")}</div>
                                <pl-icon icon="chevron-down" class="small subtle"></pl-icon>
                            </pl-button>

                            <pl-drawer>
                                <ul class="sub-list">
                                    ${tags.map(
                                        ([tag, count]) => html`
                                            <li>
                                                <pl-button
                                                    class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                                    @click=${() => this._goTo("items", { tag })}
                                                    ?selected=${this.selected === `tag/${tag}`}
                                                >
                                                    <pl-icon icon="tag"></pl-icon>

                                                    <div class="stretch ellipsis">${tag}</div>

                                                    <div class="small subtle">${count}</div>
                                                </pl-button>
                                            </li>
                                        `
                                    )}
                                </ul>
                            </pl-drawer>
                        </li>

                        <div class="separator"></div>

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${this._toggleDrawer}
                            >
                                <pl-icon icon="hirarchy"></pl-icon>
                                <div class="stretch ellipsis">${$l("Orgs & Teams")}</div>
                                <pl-icon icon="chevron-down" class="small subtle"></pl-icon>
                            </pl-button>

                            <pl-drawer>
                                <ul class="sub-list">
                                    ${app.orgs.map(
                                        (org) => html`
                                            <li>
                                                <pl-button
                                                    class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                                    ?selected=${this.selected === `orgs/${org.id}`}
                                                    @click=${() => this._goTo(`orgs/${org.id}`)}
                                                >
                                                    <pl-icon icon="org"></pl-icon>

                                                    <div class="stretch ellipsis">${org.name}</div>

                                                    <div class="small subtle warning" ?hidden=${!org.frozen}>
                                                        <pl-icon icon="error"></pl-icon>
                                                    </div>
                                                </pl-button>
                                            </li>
                                        `
                                    )}

                                    <li>
                                        <pl-button
                                            class="transparent horizontal center-aligning text-left-aligning spacing layout subtle"
                                            @click=${() => this.dispatch("create-org")}
                                        >
                                            <pl-icon icon="add"></pl-icon>

                                            <div class="stretch">${$l("New Organization")}</div>
                                        </pl-button>
                                    </li>
                                </ul>
                            </pl-drawer>
                        </li>

                        <div class="separator"></div>

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                @click=${() => this._goTo("settings")}
                                ?selected=${this.selected === "settings"}
                            >
                                <pl-icon icon="settings"></pl-icon>

                                <div class="stretch">${$l("Settings")}</div>

                                <div class="small subtle warning" ?hidden=${!showSettingsWarning}>
                                    <pl-icon icon="error"></pl-icon>
                                </div>
                            </pl-button>
                        </li>

                        <li>
                            <pl-button
                                class="transparent horizontal center-aligning text-left-aligning spacing layout"
                                class="get-premium tap"
                                @click=${this._getPremium}
                                ?hidden=${!showUpgradeButton}
                            >
                                <pl-icon icon="favorite"></pl-icon>

                                <div class="stretch">${$l("Get Premium")}</div>
                            </pl-button>
                        </li>
                    </ul>
                </nav>
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
                    class="negative borderless spacing horizontal center-aligning layout"
                    @click=${this._reportErrors}
                    ?hidden=${!app.state._errors.length}
                >
                    <pl-icon icon="error" class="warning-icon"></pl-icon>
                    <div>${app.state._errors.length}</div>
                </pl-button>
            </div>
        `;
    }
}
