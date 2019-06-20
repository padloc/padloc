import { localize as $l } from "@padloc/core/lib/locale.js";
import { PlanType } from "@padloc/core/lib/billing.js";
import { app, router } from "../init.js";
import { shared, mixins } from "../styles";
import { StateMixin } from "../mixins/state.js";
import { BaseElement, element, property, html, css } from "./base.js";
import "./logo.js";
import "./spinner.js";

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
            }

            li[selected] {
                background: rgba(255, 255, 255, 0.2);
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

            .vault,
            .org,
            .menu-tag {
                height: 35px;
                font-size: var(--font-size-tiny);
            }

            .vault pl-icon,
            .org pl-icon,
            .menu-tag pl-icon {
                width: 30px;
                height: 30px;
                font-size: 90%;
            }

            .new {
                opacity: 0.6;
            }

            pl-logo {
                height: 30px;
                margin: 15px 0 20px 0;
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
                opacity: 0.5;
            }

            .detail.warning {
                color: var(--color-negative);
                opacity: 1;
            }
        `
    ];

    render() {
        const canUpgrade =
            app.account &&
            app.billingConfig &&
            (!app.account.billing ||
                !app.account.billing.subscription ||
                app.account.billing.subscription.plan.type === PlanType.Free);

        const itemsQuota = (app.account && app.account.quota.items) || -1;

        return html`
            <div class="scroller">
                <pl-logo reveal></pl-logo>

                <nav>
                    <ul>
                        <li class="tap" @click=${() => this._goTo("items", {})} ?selected=${this.selected === "items"}>
                            <pl-icon icon="list"></pl-icon>

                            <div>${$l("Items")}</div>
                        </li>

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

                <h3>${$l("Vaults")}</h3>
                <ul>
                    ${app.vaults.map(
                        vault => html`
                            <li class="vault tap" @click=${() => this._goTo("items", { vault: vault.id })}>
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
                </ul>

                <h3>${$l("Tags")}</h3>

                <div class="no-tags" ?hidden=${!!this.state.tags.length}>${$l("You don't have any tags yet.")}</div>

                <ul>
                    ${this.state.tags.map(
                        ([tag, count]) => html`
                            <li class="menu-tag tap" @click=${() => this._goTo("items", { tag })}>
                                <pl-icon icon="tag"></pl-icon>

                                <div>${tag}</div>

                                <div class="detail">${count}</div>
                            </li>
                        `
                    )}
                </ul>

                <h3>${$l("Orgs & Teams")}</h3>

                <ul>
                    ${app.orgs.map(
                        org => html`
                            <li
                                class="org tap"
                                ?selected=${this.selected === `org/${org.id}`}
                                @click=${() => this._goTo(`org/${org.id}`)}
                            >
                                <pl-icon icon="org"></pl-icon>

                                <div>${org.name}</div>
                            </li>
                        `
                    )}

                    <li class="new org tap" @click=${() => this.dispatch("create-org")}>
                        <pl-icon icon="add"></pl-icon>

                        <div>${$l("New Organization")}</div>
                    </li>
                </ul>
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
