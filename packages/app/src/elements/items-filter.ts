import { translate as $l } from "@padloc/locale/src/translate";
import { VaultID } from "@padloc/core/src/vault";
import { Tag } from "@padloc/core/src/item";
import { StateMixin } from "../mixins/state";
import { shared, mixins } from "../styles";
import { app, router } from "../globals";
import { BaseElement, element, css, property, html } from "./base";

@element("pl-items-filter")
export class ItemsFilter extends StateMixin(BaseElement) {
    @property()
    vault: VaultID = "";

    @property()
    tag: Tag = "";

    @property()
    favorites: boolean = false;

    @property()
    attachments: boolean = false;

    @property()
    recent: boolean = false;

    @property()
    host: string = "";

    @property()
    searching: boolean = false;

    @property({ reflect: true, attribute: "selecting" })
    private _selecting: Boolean = false;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                text-align: center;
                overflow: visible;
            }

            button {
                display: flex;
                margin: 0 auto;
                align-items: center;
                font-weight: bold;
                padding: 6px 12px;
                border-radius: 20px;
                line-height: normal;
                box-sizing: border-box;
                overflow: hidden;
                max-width: 100%;
                background: var(--color-shade-1);
                border-bottom: solid 2px var(--color-shade-2);
                margin-bottom: -2px;
                font-size: var(--font-size-small);
            }

            button.vault {
                background: var(--color-primary);
                color: var(--color-tertiary);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                border-bottom: solid 2px var(--color-shade-4);
            }

            button.filter-tag {
                background: var(--color-secondary);
                color: var(--color-tertiary);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                border-bottom: solid 2px #222;
            }

            button.favorites,
            button.host {
                background: var(--color-negative);
                color: var(--color-tertiary);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                border-bottom: solid 2px var(--color-shade-4);
            }

            button pl-icon {
                font-size: 85%;
                width: 20px;
                height: 20px;
                margin-right: -6px;
            }

            button pl-icon.search-icon {
                margin-right: 3px;
                margin-left: -4px;
            }

            .list pl-icon {
                margin-left: -4px;
                margin-right: 2px;
                margin-top: 1px;
                font-size: 80%;
                width: 25px;
            }

            button > div,
            .option > div {
                ${mixins.ellipsis()}
            }

            .scrim {
                z-index: 10;
                border-top: solid 3px #f2f2f2;
                background: rgba(255, 255, 255, 0.5);
                ${mixins.fullbleed()}
                top: 60px;
                will-change: opacity;
                transition: opacity 200ms cubic-bezier(0.6, 0, 0.2, 1);
            }

            :host(:not([selecting])) .scrim {
                opacity: 0;
                pointer-events: none;
            }

            :host(:not([selecting])) .list {
                transform: translate3d(0, -100%, 0);
            }

            .list {
                padding: 12px 6px 6px 6px;
                background: var(--color-tertiary);
                box-sizing: border-box;
                max-height: 100%;
                width: 100%;
                font-size: var(--font-size-tiny);
                border-bottom: solid 3px var(--color-shade-1);
                will-change: transform;
                transition: transform 200ms cubic-bezier(0.6, 0, 0.2, 1);
                ${mixins.scroll()}
            }

            .list button {
                margin-bottom: 6px;
                border-bottom: none;
                padding: 5px 10px;
                text-shadow: none;
            }

            h4 {
                margin: 16px 10px 10px 10px;
                text-align: center;
                opacity: 0.8;
            }

            .no-tags {
                font-size: var(--font-size-micro);
                padding: 5px 10px 15px 10px;
                opacity: 0.5;
            }

            .count {
                opacity: 0.7;
                margin-left: 6px;
                margin-right: 2px;
                font-size: var(--font-size-tiny);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .scrim {
                    top: calc(50px + max(env(safe-area-inset-top), 8px));
                }
            }
        `
    ];

    render() {
        if (!app.mainVault) {
            return html``;
        }
        const { vault: vaultId, tag, favorites, attachments, recent, host } = this;
        const vault = app.getVault(vaultId);
        const cl = favorites
            ? "favorites"
            : recent
            ? "recent"
            : vault
            ? "vault"
            : attachments
            ? "attachments"
            : tag
            ? "filter-tag"
            : host
            ? "host"
            : "all";
        const label = favorites
            ? $l("Favorites")
            : recent
            ? $l("Recently Used")
            : attachments
            ? $l("Attachments")
            : host
            ? this.state.currentHost
            : vault
            ? vault.name
            : tag || $l("All Items");
        const accId = (app.account && app.account.id) || "";

        const favCount = app.vaults.reduce((count, vault) => {
            return [...vault.items].reduce(
                (c, item) => (item.favorited && item.favorited.includes(accId) ? c + 1 : c),
                count
            );
        }, 0);

        const attCount = app.vaults.reduce((count, vault) => {
            return [...vault.items].reduce((c, item) => (item.attachments.length ? c + 1 : c), count);
        }, 0);

        const recentThreshold = new Date(Date.now() - app.settings.recentLimit * 24 * 60 * 60 * 1000);
        const recentCount = app.vaults.reduce((count, vault) => {
            return [...vault.items].reduce((c, item) => (item.lastUsed > recentThreshold ? c + 1 : c), count);
        }, 0);

        const totalCount = app.vaults.reduce((count, vault) => count + vault.items.size, 0);

        const hostCount = this.state.currentHost ? app.getItemsForHost(this.state.currentHost).length : 0;

        return html`
            <button class="tap ${cl}" @click=${() => (this._selecting = !this._selecting)}>
                <pl-icon icon="search" class="search-icon" ?hidden=${!this.searching}></pl-icon>

                <div>${label}</div>

                <pl-icon icon="dropdown"></pl-icon>
            </button>

            <div class="scrim" @click=${() => this._dismiss()}>
                <div class="list ${cl}">
                    <button class="host tap" @click=${() => this._select({ host: true })} ?hidden=${!hostCount}>
                        <pl-icon icon="web"></pl-icon>
                        <div>
                            ${this.state.currentHost}
                        </div>
                        <div class="count">${hostCount}</div>
                    </button>

                    <button class="all tap" @click=${() => this._select({})}>
                        <pl-icon icon="list"></pl-icon>
                        <div>
                            ${$l("All Items")}
                        </div>
                        <div class="count">${totalCount}</div>
                    </button>

                    <button class="recent tap" @click=${() => this._select({ recent: true })}>
                        <pl-icon icon="time"></pl-icon>
                        <div>
                            ${$l("Recently Used")}
                        </div>
                        <div class="count">${recentCount}</div>
                    </button>

                    <button class="attachments tap" @click=${() => this._select({ attachments: true })}>
                        <pl-icon icon="attachment"></pl-icon>
                        <div>
                            ${$l("Attachments")}
                        </div>
                        <div class="count">${attCount}</div>
                    </button>

                    <button class="favorites tap" @click=${() => this._select({ favorites: true })}>
                        <pl-icon icon="favorite"></pl-icon>
                        <div>
                            ${$l("Favorites")}
                        </div>
                        <div class="count">${favCount}</div>
                    </button>

                    <button class="vault tap" @click=${() => this._select({ vault: app.mainVault!.id })}>
                        <pl-icon icon="vault"></pl-icon>
                        <div>
                            ${$l("My Vault")}
                        </div>
                        <div class="count">${app.mainVault!.items.size}</div>
                    </button>

                    ${app.orgs.map(org => {
                        const vaults = app.vaults.filter(v => v.org && v.org.id === org.id);

                        return html`
                            <h4>${org.name}</h4>

                            ${vaults.map(
                                vault => html`
                                    <button class="vault tap" @click=${() => this._select({ vault: vault.id })}>
                                        <pl-icon icon="vault"></pl-icon>
                                        <div>
                                            ${vault.name}
                                        </div>
                                        <div class="count">${vault.items.size}</div>
                                    </button>
                                `
                            )}
                        `;
                    })}

                    <h4>${$l("Tags")}</h4>

                    <div class="no-tags" ?hidden=${!!this.state.tags.length}>
                        ${$l("You don't have any tags yet.")}
                    </div>

                    ${app.state.tags.map(
                        ([tag, count]) => html`
                            <button class="filter-tag tap" @click=${() => this._select({ tag })}>
                                <pl-icon icon="tag"></pl-icon>
                                <div>
                                    ${tag}
                                </div>
                                <div class="count">${count}</div>
                            </button>
                        `
                    )}
                </div>
            </div>
        `;
    }

    _select({
        tag,
        vault,
        favorites,
        recent,
        attachments,
        host
    }: {
        tag?: Tag;
        vault?: VaultID;
        favorites?: boolean;
        recent?: boolean;
        attachments?: boolean;
        host?: boolean;
    }) {
        const params: any = {};
        if (tag) {
            params.tag = tag;
        }
        if (vault) {
            params.vault = vault;
        }
        if (favorites) {
            params.favorites = favorites;
        }
        if (attachments) {
            params.attachments = attachments;
        }
        if (recent) {
            params.recent = recent;
        }
        if (host) {
            params.host = host;
        }
        router.go("items", params);
    }

    _dismiss() {
        this._selecting = false;
    }
}
