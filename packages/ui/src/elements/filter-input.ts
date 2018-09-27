import { Store } from "@padlock/core/lib/store.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { app } from "../init.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";
import { Input } from "./input";
import "./icon.js";

interface Result {
    icon: string;
    name: string;
    class: string;
    val: Store | string;
}

@element("pl-filter-input")
export class FilterInput extends BaseElement {
    @property() store: Store | null = null;
    @property() tag: string | null = null;

    get filterString(): string {
        return (this._input && this._input.value.toLowerCase()) || "";
    }

    set filterString(val: string) {
        this._input.value = val;
    }

    get focused() {
        return this._input.focused;
    }

    @property() private _showResults: boolean = false;
    @property() private _stores: Store[] = [];
    @property() private _tags: string[] = [];

    @query("pl-input") private _input: Input;

    focus() {
        this._input.focus();
    }

    clear() {
        this.store = null;
        this.tag = null;
        this._input.value = "";
        this._input.blur();
        this.dispatch("input");
    }

    render() {
        const { store, tag, _showResults } = this;
        const results: Result[] = [];

        if (!this.store) {
            for (const store of this._stores) {
                results.push({ icon: "group", name: store.name, class: "highlight", val: store });
            }
        }

        if (!this.tag) {
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
                    z-index: 1;
                    height: var(--row-height);
                    overflow: visible;
                    box-shadow: rgba(0, 0, 0, 0.2) 0 1px 1px;
                }

                .results {
                    padding: 0 10px 10px 10px;
                    margin-top: 0;
                    background: inherit;
                    box-shadow: inherit;
                    ${mixins.scroll("horizontal")}
                }

                pl-input {
                    padding: 0;
                    font-size: var(--font-size-small);
                }

                .input-wrapper {
                    padding-left: 10px;
                }

                .input-wrapper pl-icon {
                    height: 50px;
                    width: 50px;
                }
            </style>

            <div class="input-wrapper layout horizontal align-center">

                <div class="tags small filters">

                    <div class="tag highlight" ?hidden=${!store} @click=${() => (this.store = null)}>

                        <pl-icon icon="group"></pl-icon>

                        <div>${store && store.name}</div>

                    </div>

                    <div class="tag" ?hidden=${!tag} @click=${() => (this.tag = null)}>

                        <pl-icon icon="tag"></pl-icon>

                        <div>${tag}</div>

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
        this._stores = app.stores.filter(s => s.name.toLowerCase().startsWith(this.filterString));
        this._tags = app.tags.filter(t => t.toLowerCase().startsWith(this.filterString));
    }

    private _select(res: Result) {
        if (res.val instanceof Store) {
            this.store = res.val;
        } else {
            this.tag = res.val;
        }

        this._input.value = "";
        this._input.focus();
        this.dispatch("input");
    }

    private _keydown(e: KeyboardEvent) {
        if (e.key === "Backspace" && this.filterString === "") {
            if (this.tag) {
                this.tag = null;
            } else {
                this.store = null;
            }
            this.dispatch("input");
        }
    }
}
