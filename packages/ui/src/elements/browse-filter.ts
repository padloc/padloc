import { localize as $l } from "@padlock/core/lib/locale.js";
import { Vault, Tag } from "@padlock/core/lib/vault.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, property, html, listen } from "./base.js";

@element("pl-browse-filter")
export class BrowseFilter extends BaseElement {
    @property()
    private _selecting: Boolean = false;

    @listen("filter-changed", app)
    _update() {
        this.requestUpdate();
    }

    render() {
        const { vault, tag } = app.filter;
        const cl = vault ? "vault" : tag ? "filter-tag" : "all";
        const icon = vault ? "vault" : tag ? "tag" : "list";
        const label = vault ? vault.toString() : tag || $l("All Items");

        return html`
            ${shared}

            <style>
                :host {
                    display: block;
                    text-align: center;
                    overflow: visible;
                }

                button, .list {
                    display: inline-block;
                    border-radius: 17px;
                    font-size: var(--font-size-small);
                    font-weight: bold;
                    width: auto;
                    margin: 0 auto;
                }

                button, .option {
                    display: flex;
                    align-items: center;
                    font-weight: bold;
                    text-align: left;
                }

                button {
                    padding: 0 7px 0 13px;
                    height: 35px;
                    line-height: normal;
                    box-sizing: border-box;
                    overflow: hidden;
                    max-width: 100%;
                }

                button.all, .list {
                    background: var(--color-quaternary);
                    border: solid 1px #eee;
                }

                button.vault {
                    ${mixins.gradientHighlight(true)};
                    color: var(--color-tertiary);
                    text-shadow: rgba(0, 0, 0, 0.2) 0 1px 0;
                }

                button.filter-tag {
                    ${mixins.gradientDark(true)};
                    color: var(--color-tertiary);
                    text-shadow: rgba(0, 0, 0, 0.2) 0 1px 0;
                }

                button pl-icon {
                    font-size: 80%;
                    width: 25px;
                    height: 25px;
                    margin-top: 4px;
                }

                button > div, .option > div {
                    ${mixins.ellipsis()}
                    flex: 1;
                }

                .scrim {
                    padding: 8px;
                    ${mixins.fullbleed()}
                    z-index: 10;
                    background: var(--color-scrim);
                }

                .list {
                    padding: 5px 10px;
                    box-sizing: border-box;
                    max-height: 100%;
                    max-width: 100%;
                    ${mixins.scroll()}
                }

                .option {
                    padding-right: 10px;
                }

                .option:not(:last-child) {
                    border-bottom: solid 1px #eee;
                }

                h4 {
                    margin: 10px;
                    text-align: left;
                    opacity: 0.8;
                }

                .no-tags {
                    font-size: var(--font-size-micro);
                    padding: 5px 10px 15px 10px;
                    opacity: 0.5;
                }
            </style>

            <button class="tap ${cl}" @click=${() => (this._selecting = true)} ?hidden=${this._selecting}>

                <pl-icon icon="${icon}"></pl-icon>

                <div>${label}</div>

                <pl-icon icon="dropdown"></pl-icon>

            </button>

            <div class="scrim" ?hidden=${!this._selecting} @click=${() => this._dismiss()}>

                <div class="list ${cl}">

                    <div>

                        <div class="option tap" @click=${() => this._select({ tag: null, vault: null })}>

                            <pl-icon icon="list"></pl-icon>

                            <div>${$l("All Items")}</div>

                        </div>

                    </div>

                    <div>

                        <div>

                            <h4>${$l("Vaults")}</h4>

                            ${app.vaults.map(
                                vault => html`
                                    <div class="option tap" @click=${() => this._select({ tag: null, vault })}>

                                        <pl-icon icon="vault"></pl-icon>

                                        <div>${vault.parent ? `${vault.parent.name}/${vault.name}` : vault.name}</div>

                                    </div>
                                `
                            )}

                        </div>

                        <div>

                            <h4>${$l("Tags")}</h4>

                            <div class="no-tags" ?hidden=${!!app.tags.length}>
                                ${$l("You don't have any tags yet.")}
                            </div>

                            ${app.tags.map(
                                tag => html`
                                    <div class="option tap" @click=${() => this._select({ tag, vault: null })}>

                                        <pl-icon icon="tag"></pl-icon>

                                        <div>${tag}</div>

                                    </div>
                                `
                            )}

                        </div>

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
