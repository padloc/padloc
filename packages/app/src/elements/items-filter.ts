import { localize as $l } from "@padloc/core/lib/locale.js";
import { Vault } from "@padloc/core/lib/vault.js";
import { Tag } from "@padloc/core/lib/item.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, property, html, listen } from "./base.js";

@element("pl-items-filter")
export class ItemsFilter extends BaseElement {
    @property({ reflect: true, attribute: "selecting" })
    private _selecting: Boolean = false;

    @listen("filter-changed", app)
    _update() {
        this.requestUpdate();
    }

    render() {
        const { vault, tag } = app.filter;
        const cl = vault ? "vault" : tag ? "filter-tag" : "all";
        const label = vault ? vault.toString() : tag || $l("All Items");

        return html`
            ${shared}

            <style>
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

                button.favorites {
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

                .list pl-icon {
                    margin-left: -6px;
                    margin-right: 0;
                    font-size: 80%;
                    width: 25px;
                }

                button > div, .option > div {
                    ${mixins.ellipsis()}
                    flex: 1;
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
            </style>

            <button class="tap ${cl}" @click=${() => (this._selecting = !this._selecting)}>
                <div>${label}</div>

                <pl-icon icon="dropdown"></pl-icon>
            </button>

            <div class="scrim" @click=${() => this._dismiss()}>
                <div class="list ${cl}">
                    <button class="all tap" @click=${() => this._select({ tag: null, vault: null })}>
                        <pl-icon icon="list"></pl-icon>
                        <div>
                            ${$l("All Items")}
                        </div>
                    </button>

                    <button class="favorites tap" @click=${() => this._select({ tag: null, vault: null })}>
                        <pl-icon icon="favorite"></pl-icon>
                        <div>
                            ${$l("Favorites")}
                        </div>
                    </button>

                    <h4>${$l("Vaults")}</h4>

                    ${app.vaults.map(
                        vault => html`
                            <button class="vault tap" @click=${() => this._select({ tag: null, vault })}>
                                <pl-icon icon="vault"></pl-icon>
                                <div>
                                    ${vault}
                                </div>
                            </button>
                        `
                    )}

                    <h4>${$l("Tags")}</h4>

                    <div class="no-tags" ?hidden=${!!app.tags.length}>
                        ${$l("You don't have any tags yet.")}
                    </div>

                    ${app.tags.map(
                        tag => html`
                            <button class="filter-tag tap" @click=${() => this._select({ tag, vault: null })}>
                                <pl-icon icon="tag"></pl-icon>
                                <div>
                                    ${tag}
                                </div>
                            </button>
                        `
                    )}
                </div>
            </div>
        `;
    }

    _select({ tag, vault }: { tag: Tag | null; vault: Vault | null }) {
        app.filter = {
            tag,
            vault,
            text: app.filter.text
        };
    }

    _dismiss() {
        this._selecting = false;
    }
}
