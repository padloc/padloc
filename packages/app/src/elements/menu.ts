import { localize as $l } from "@padloc/core/src/locale";
import { PlanType } from "@padloc/core/src/billing";
import { app, router } from "../init";
import { shared, mixins } from "../styles";
import { StateMixin } from "../mixins/state";
import { BaseElement, element, property, html, css } from "./base";
import "./logo";
import "./spinner";

@element("pl-menu")
export class Menu extends StateMixin(BaseElement) {
    @property()
    selected: string = "items";

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

            .favorites {
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
                margin: 15px 0;
                opacity: 0.25;
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
                flex: none;
                opacity: 0.7;
                font-weight: semi-bold;
            }

            .detail.warning {
                color: var(--color-negative);
                opacity: 1;
            }

            .separator {
                height: 2px;
                background: var(--color-shade-2);
                border-radius: 100%;
                margin: 8px 16px;
            }
        `
    ];

    render() {
        const accId = (app.account && app.account.id) || "";
        const canUpgrade =
            app.account &&
            app.billingConfig &&
            (!app.account.billing ||
                !app.account.billing.subscription ||
                app.account.billing.subscription.plan.type === PlanType.Free);

        const itemsQuota = (app.account && app.account.quota.items) || -1;

        const favCount = app.vaults.reduce((count, vault) => {
            return [...vault.items].reduce(
                (c, item) => (item.favorited && item.favorited.includes(accId) ? c + 1 : c),
                count
            );
        }, 0);

        const attCount = app.vaults.reduce((count, vault) => {
            return [...vault.items].reduce((c, item) => (item.attachments.length ? c + 1 : c), count);
        }, 0);

        return html`
            <div class="scroller">
                <pl-logo reveal></pl-logo>

                <div class="separator"></div>

                <nav>
                    <ul>
                        <li class="tap" @click=${() => this._goTo("items", {})} ?selected=${this.selected === "items"}>
                            <pl-icon icon="list"></pl-icon>

                            <div>${$l("Items")}</div>
                        </li>

                        <li
                            class="sub-item tap favorites"
                            @click=${() => this._goTo("items", { favorites: true })}
                            ?selected=${this.selected === "favorites"}
                        >
                            <pl-icon icon="favorite"></pl-icon>

                            <div>${$l("Favorites")}</div>

                            <div class="detail">${favCount}</div>
                        </li>

                        ${app.vaults.map(
                            vault => html`
                                <li
                                    class="sub-item tap vault"
                                    @click=${() => this._goTo("items", { vault: vault.id })}
                                    ?selected=${this.selected === `vault/${vault.id}`}
                                >
                                    <pl-icon icon="vault"></pl-icon>
                                    <div>${vault}</div>
                                    <div
                                        class="detail ${vault.id === app.mainVault!.id && itemsQuota !== -1
                                            ? "warning"
                                            : ""}"
                                    >
                                        ${vault.id === app.mainVault!.id && itemsQuota !== -1
                                            ? `${vault.items.size} / ${itemsQuota}`
                                            : vault.items.size}
                                    </div>
                                </li>
                            `
                        )}

                        <li
                            class="sub-item tap"
                            @click=${() => this._goTo("items", { attachments: true })}
                            ?selected=${this.selected === "attachments"}
                        >
                            <pl-icon icon="attachment"></pl-icon>

                            <div>${$l("Attachments")}</div>

                            <div class="detail">${attCount}</div>
                        </li>

                        ${this.state.tags.map(
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
                        </li>

                        <li class="get-premium tap" @click=${this._getPremium} ?hidden=${!canUpgrade}>
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
                <pl-spinner .active=${this.state.syncing} class="syncing"></pl-spinner>
            </div>
        `;
    }
}
