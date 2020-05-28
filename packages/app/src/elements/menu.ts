import { translate as $l } from "@padloc/locale/src/translate";
import { PlanType, SubscriptionStatus } from "@padloc/core/src/billing";
import { ErrorCode } from "@padloc/core/src/error";
import { Vault } from "@padloc/core/src/vault";
import { app, router } from "../globals";
import { shared, mixins } from "../styles";
import { dialog, alert } from "../lib/dialog";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, property, html, css } from "./base";
import "./logo";
import "./spinner";
import { ReportErrorsDialog } from "./report-errors-dialog";

@element("pl-menu")
export class Menu extends StateMixin(BaseElement) {
    @property()
    selected: string = "items";

    @dialog("pl-report-errors-dialog")
    _reportErrorsDialog: ReportErrorsDialog;

    private _goTo(path: string, params?: any) {
        this.dispatch("toggle-menu");
        router.go(path, params);
    }

    private _lock() {
        this.dispatch("toggle-menu");
        app.lock();
    }

    private _getPremium() {
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
                        type: "warning"
                    }
                );
                return;
            case ErrorCode.MISSING_ACCESS:
                alert($l("This vault could not be synchronized because you no longer have access to it."), {
                    title: "Sync Failed",
                    type: "warning"
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
                        type: "warning"
                    }
                );
                return;
        }
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: column;
                color: var(--color-tertiary);
                font-size: var(--font-size-small);
            }

            .scroller {
                flex: 1;
                height: 0;
                ${mixins.scroll()}
                padding: 10px 0;
            }

            li {
                background: transparent;
                border: none;
                display: flex;
                align-items: center;
                height: 40px;
                margin: 2px 10px;
                padding-right: 10px;
                border-radius: 8px;
                overflow: hidden;
                height: 40px;
                font-weight: 600;
                --color-highlight: var(--color-tertiary);
                --color-foreground: var(--color-secondary);
            }

            li:not(.sub-item) {
                margin-top: 8px;
            }

            li[selected] {
                background: var(--color-highlight);
                box-shadow: rgba(0, 0, 0, 0.1) 0 1px 1px;
                color: var(--color-foreground);
                font-weight: bold;
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

            .sub-item {
                height: 35px;
                font-size: var(--font-size-tiny);
                margin-left: 20px;
            }

            .sub-item pl-icon {
                width: 30px;
                height: 30px;
                font-size: 90%;
            }

            .favorites,
            .host {
                --color-highlight: var(--color-negative);
                --color-foreground: var(--color-tertiary);
            }

            .vault {
                --color-highlight: var(--color-primary);
                --color-foreground: var(--color-tertiary);
            }

            .new {
                opacity: 0.6;
            }

            pl-logo {
                height: 30px;
                margin: 15px auto 0 auto;
                opacity: 0.25;
            }

            .version {
                text-align: center;
                margin-bottom: 15px;
                font-size: var(--font-size-micro);
                font-weight: 600;
                opacity: 0.3;
            }

            .no-tags {
                font-size: var(--font-size-micro);
                padding: 0 20px;
                opacity: 0.5;
                width: 100px;
            }

            .footer {
                padding: 5px;
                display: flex;
                align-items: center;
                box-shadow: rgba(0, 0, 0, 0.2) 0 -1px 15px 0px;
                z-index: 1;
            }

            .footer pl-icon {
                width: 30px;
                height: 30px;
                font-size: var(--font-size-tiny);
            }

            .syncing {
                width: 20px;
                height: 20px;
                margin: 5px;
            }

            .get-premium {
                background: var(--color-negative);
            }

            li .detail {
                margin-left: 2px;
                flex: none;
                opacity: 0.7;
                font-weight: semi-bold;
                padding: 2px 6px;
                margin-right: -4px;
                opacity: 1;
                border-radius: var(--border-radius);
                display: flex;
            }

            li .detail pl-icon {
                height: 20px;
                width: 20px;
            }

            .detail.warning {
                color: white;
                opacity: 1;
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
        `
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
            <div class="scroller">
                <pl-logo reveal></pl-logo>

                <div class="version">v${process.env.PL_VERSION}</div>

                <div class="separator"></div>

                <nav>
                    <ul>
                        <li class="tap" @click=${() => this._goTo("items", {})} ?selected=${this.selected === "items"}>
                            <pl-icon icon="list"></pl-icon>

                            <div>${$l("Items")}</div>
                        </li>

                        <li
                            class="sub-item tap favorites"
                            @click=${() => this._goTo("items", { host: true })}
                            ?selected=${this.selected === "host"}
                            ?hidden=${!count.currentHost}
                        >
                            <pl-icon icon="web"></pl-icon>

                            <div>${this.app.state.currentHost}</div>

                            <div class="detail">${count.currentHost}</div>
                        </li>

                        <li
                            class="sub-item tap"
                            @click=${() => this._goTo("items", { recent: true })}
                            ?selected=${this.selected === "recent"}
                        >
                            <pl-icon icon="time"></pl-icon>

                            <div>${$l("Recently Used")}</div>

                            <div class="detail">${count.recent}</div>
                        </li>

                        <li
                            class="sub-item tap favorites"
                            @click=${() => this._goTo("items", { favorites: true })}
                            ?selected=${this.selected === "favorites"}
                        >
                            <pl-icon icon="favorite"></pl-icon>

                            <div>${$l("Favorites")}</div>

                            <div class="detail">${count.favorites}</div>
                        </li>

                        <li
                            class="sub-item tap"
                            @click=${() => this._goTo("items", { attachments: true })}
                            ?selected=${this.selected === "attachments"}
                        >
                            <pl-icon icon="attachment"></pl-icon>

                            <div>${$l("Attachments")}</div>

                            <div class="detail">${count.attachments}</div>
                        </li>

                        <li
                            class="sub-item tap vault"
                            @click=${() => this._goTo("items", { vault: mainVault.id })}
                            ?selected=${this.selected === `vault/${mainVault.id}`}
                        >
                            <pl-icon icon="vault"></pl-icon>
                            <div>${$l("My Vault")}</div>
                            ${mainVault.error
                                ? html`
                                      <div
                                          class="detail tap warning"
                                          @click=${(e: Event) => this._displayVaultError(mainVault, e)}
                                      >
                                          <pl-icon icon="error"></pl-icon>
                                      </div>
                                  `
                                : itemsQuota !== -1
                                ? html`
                                      <div class="detail tap warning" @click=${this._getPremium}>
                                          ${mainVault.items.size} / ${itemsQuota}
                                      </div>
                                  `
                                : html`
                                      <div class="detail">
                                          ${mainVault.items.size}
                                      </div>
                                  `}
                        </li>

                        ${app.orgs.map(org => {
                            const vaults = app.vaults.filter(v => v.org && v.org.id === org.id);

                            return html`
                                <div class="subsection">
                                    <div class="subsection-header">${org.name}</div>
                                    ${vaults.map(vault => {
                                        return html`
                                            <li
                                                class="sub-item tap vault"
                                                @click=${() => this._goTo("items", { vault: vault.id })}
                                                ?selected=${this.selected === `vault/${vault.id}`}
                                            >
                                                <pl-icon icon="vault"></pl-icon>
                                                <div>${vault.name}</div>

                                                ${vault.error
                                                    ? html`
                                                          <div
                                                              class="detail tap warning"
                                                              @click=${(e: Event) => this._displayVaultError(vault, e)}
                                                          >
                                                              <pl-icon icon="error"></pl-icon>
                                                          </div>
                                                      `
                                                    : html`
                                                          <div class="detail">
                                                              ${vault.items.size}
                                                          </div>
                                                      `}
                                            </li>
                                        `;
                                    })}
                                </div>
                            `;
                        })}

                        <div class="subsection" ?hidden=${!tags.length}>
                            <div class="subsection-header">${$l("Tags")}</div>
                            ${tags.map(
                                ([tag, count]) => html`
                                    <li
                                        class="sub-item tap"
                                        @click=${() => this._goTo("items", { tag })}
                                        ?selected=${this.selected === `tag/${tag}`}
                                    >
                                        <pl-icon icon="tag"></pl-icon>

                                        <div>${tag}</div>

                                        <div class="detail">${count}</div>
                                    </li>
                                `
                            )}
                        </div>

                        <li class="new sub-item tap" @click=${() => this.dispatch("create-item")}>
                            <pl-icon icon="add"></pl-icon>

                            <div>${$l("New Vault Item")}</div>
                        </li>

                        <div class="separator"></div>

                        <li class="tap" ?selected=${this.selected === "orgs"} @click=${() => this._goTo("orgs")}>
                            <pl-icon icon="hirarchy"></pl-icon>

                            <div>
                                ${$l("Orgs & Teams")}
                            </div>
                        </li>

                        ${app.orgs.map(
                            org => html`
                                <li
                                    class="sub-item tap"
                                    ?selected=${this.selected === `orgs/${org.id}`}
                                    @click=${() => this._goTo(`orgs/${org.id}`)}
                                >
                                    <pl-icon icon="org"></pl-icon>

                                    <div>${org.name}</div>

                                    <div class="detail warning" ?hidden=${!org.frozen}>
                                        <pl-icon icon="error"></pl-icon>
                                    </div>
                                </li>
                            `
                        )}

                        <li class="new sub-item tap" @click=${() => this.dispatch("create-org")}>
                            <pl-icon icon="add"></pl-icon>

                            <div>${$l("New Organization")}</div>
                        </li>

                        <div class="separator"></div>

                        <li
                            class="tap"
                            @click=${() => this._goTo("settings")}
                            ?selected=${this.selected === "settings"}
                        >
                            <pl-icon icon="settings"></pl-icon>

                            <div>${$l("Settings")}</div>

                            <div class="detail warning" ?hidden=${!showSettingsWarning}>
                                <pl-icon icon="error"></pl-icon>
                            </div>
                        </li>

                        <li class="get-premium tap" @click=${this._getPremium} ?hidden=${!showUpgradeButton}>
                            <pl-icon icon="favorite"></pl-icon>

                            <div>${$l("Get Premium")}</div>
                        </li>
                    </ul>
                </nav>
            </div>

            <div class="footer">
                <pl-icon icon="lock" class="tap" @click=${this._lock}></pl-icon>
                <pl-icon icon="refresh" class="tap" @click=${() => app.synchronize()}></pl-icon>
                <div class="flex"></div>
                <pl-spinner .active=${app.state.syncing} class="syncing"></pl-spinner>
                <button class="errors-button tap" @click=${this._reportErrors} ?hidden=${!app.state._errors.length}>
                    <pl-icon icon="error" class="warning-icon"></pl-icon>
                    <div>${app.state._errors.length}</div>
                </button>
            </div>
        `;
    }
}
