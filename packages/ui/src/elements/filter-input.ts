import { Vault } from "@padlock/core/lib/vault.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { FilterParams } from "@padlock/core/lib/app.js";
import { app } from "../init.js";
import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";
import { Input } from "./input";
import "./icon.js";

interface Result {
    icon: string;
    name: string;
    class: string;
    val: Vault | string;
}

@element("pl-filter-input")
export class FilterInput extends BaseElement implements FilterParams {
    @property()
    vault: Vault | null = null;
    @property()
    tag: string | null = null;

    get text(): string {
        return (this._input && this._input.value.toLowerCase()) || "";
    }

    set text(val: string) {
        this._input.value = val;
    }

    get focused() {
        return this._input.focused;
    }

    @property()
    private _showResults: boolean = false;
    @property()
    private _vaults: Vault[] = [];
    @property()
    private _tags: string[] = [];

    @query("pl-input")
    private _input: Input;

    focus() {
        this._input.focus();
    }

    clear() {
        this.vault = null;
        this.tag = null;
        this._input.value = "";
        this._input.blur();
        this.dispatch("input");
    }

    render() {
        const { vault, tag, _showResults } = this;
        const results: Result[] = [];

        if (!vault) {
            for (const vault of this._vaults) {
                const name = vault.toString();
                results.push({ icon: "group", name: name, class: "highlight", val: vault });
            }
        }

        if (!tag) {
            for (const tag of this._tags) {
                results.push({ icon: "tag", name: tag, class: "", val: tag });
            }
        }

        return html`
            ${shared}

            <style>
                :host {
                    background: var(--color-tertiary);
                    position: relative;
                    overflow: visible;
                    border-radius: 20px;
                    border: solid 1px #eee;
                    margin: 8px;
                    font-size: var(--font-size-small);
                    overflow: hidden;
                }

                .results {
                    padding: 0 10px;
                    margin-top: 0;
                    flex-wrap: wrap;
                }

                .results .tag {
                    margin-top: 6px;
                }

                pl-input {
                    padding: 0;
                    height: 40px;
                    line-height: 40px;
                    font-size: inherit;
                }

                pl-icon[icon="search"] {
                    opacity: 0.5;
                }
            </style>

            <div class="input-wrapper layout horizontal align-center">

                <pl-icon icon="search"></pl-icon>

                <div class="tags small filters">

                    <div class="tag highlight" ?hidden=${!vault} @click=${() => (this.vault = null)}>

                        <pl-icon icon="group"></pl-icon>

                        <div>${vault}</div>

                        <pl-icon icon="cancel"></pl-icon>

                    </div>

                    <div class="tag" ?hidden=${!tag} @click=${() => (this.tag = null)}>

                        <pl-icon icon="tag"></pl-icon>

                        <div>${tag}</div>

                        <pl-icon icon="cancel"></pl-icon>

                    </div>

                    <div></div>

                </div>

                <pl-input
                    flex
                    .placeholder=${$l("Type To Filter")}
                    @input=${() => this._updateResults()}
                    @focus=${() => this._focus()}
                    @blur=${() => this._blur()}
                    @escape=${() => this.clear()}
                    @keydown=${(e: KeyboardEvent) => this._keydown(e)}>
                </pl-input>

                <pl-icon icon="cancel" class="tap" @click=${() => this.clear()}></pl-icon>

            </div>

            <div class="tags small results" ?hidden=${!_showResults || !results.length}>
                ${results.map(
                    res => html`
                    <div class="tag tap ${res.class}" @click=${() => this._select(res)}>

                        <pl-icon icon=${res.icon}></pl-icon>

                        <div>${res.name}</div>

                    </div>
                `
                )}
            </div>
        `;
    }

    private _focus() {
        this._updateResults();
        this._showResults = true;
    }

    private _blur() {
        setTimeout(() => {
            if (!this._input.focused) {
                this._showResults = false;
            }
            this.dispatch("input");
        }, 200);
    }

    private _updateResults() {
        this._vaults = app.vaults.filter(s => s.name.toLowerCase().startsWith(this.text));
        this._tags = app.tags.filter(t => t.toLowerCase().startsWith(this.text));
    }

    private _select(res: Result) {
        if (res.val instanceof Vault) {
            this.vault = res.val;
        } else {
            this.tag = res.val;
        }

        this._input.value = "";
        this._input.focus();
        this.dispatch("input");
    }

    private _keydown(e: KeyboardEvent) {
        if (e.key === "Backspace" && this.text === "") {
            if (this.tag) {
                this.tag = null;
            } else {
                this.vault = null;
            }
            this.dispatch("input");
        }
    }
}
