import { translate as $l } from "@padloc/locale/src/translate";
import { Vault } from "@padloc/core/src/vault";
import { Tag } from "@padloc/core/src/item";
import { app } from "../globals";
import { shared } from "../styles";
import { BaseElement, element, html, css, property, query } from "./base";
import { Input } from "./input";
import "./icon";

@element("pl-tags-input")
export class TagsInput extends BaseElement {
    @property()
    editing: boolean = false;
    @property()
    vault: Vault | null = null;
    @property()
    tags: Tag[] = [];
    @property()
    _showResults: Boolean = false;

    @query("pl-input")
    private _input: Input;

    private _focusTimeout: number = 0;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                z-index: 1;
                overflow: visible;
                font-size: var(--font-size-small);
                overflow: visible;
            }

            .wrapper {
                flex-wrap: wrap;
                overflow: visible;
                margin-top: -6px;
            }

            .wrapper > * {
                margin-top: 6px;
            }

            .tags.small .tag {
                padding: 5px 7px;
            }

            .results {
                padding: 0;
                border-radius: 8px;
                margin-top: 0;
                flex-direction: column;
                align-items: flex-start;
            }

            .results .tag {
                padding: 6px 8px;
                margin-top: 6px;
            }

            .input-wrapper {
                font-size: var(--font-size-micro);
                padding: 0 4px;
                height: 24px;
                line-height: 24px;
                background: var(--color-tertiary);
                border: solid 1px var(--color-shade-4);
                border-radius: 8px;
                align-self: stretch;
                position: relative;
                min-width: 80px;
                overflow: hidden;
            }

            .input-wrapper pl-input {
                font-size: inherit;
                position: absolute;
                height: 100%;
                width: 100%;
                box-sizing: border-box;
                padding-left: 20px;
                top: 0;
                font-weight: bold;
                pointer-events: none;
            }

            .add-tag {
                height: 26px;
                overflow: visible;
            }

            .add-tag .input-wrapper pl-icon {
                height: 25px;
            }
        `
    ];

    render() {
        const { tags, editing, vault, _showResults } = this;
        const { value } = this._input || { value: "" };
        const results = app.state.tags
            .filter(([t]) => !this.tags.includes(t) && t !== value && t.toLowerCase().startsWith(value))
            .map(([t]) => t);
        if (value) {
            results.push(value);
        }

        return html`
            <div class="tags small wrapper">
                <div class="tag highlight tap" @click=${() => this._vaultClicked()}>
                    <pl-icon icon="vault"></pl-icon>

                    <div class="tag-name">${vault}</div>
                </div>

                ${tags.map(
                    tag => html`
                        <div class="tag tap" @click=${() => this._tagClicked(tag)}>
                            <pl-icon icon="tag"></pl-icon>

                            <div>${tag}</div>

                            <pl-icon icon="cancel" ?hidden=${!editing}></pl-icon>
                        </div>
                    `
                )}

                <div class="add-tag" ?hidden=${!editing}>
                    <div class="input-wrapper tap" @click=${() => this._input.focus()}>
                        <pl-icon icon="add"></pl-icon>

                        <pl-input
                            .placeholder=${$l("Add Tag")}
                            @enter=${() => this._addTag(value)}
                            @input=${() => this.requestUpdate()}
                            @focus=${() => this._focusChanged()}
                            @blur=${() => this._focusChanged()}
                        >
                        </pl-input>
                    </div>

                    <div class="tags small results" ?hidden=${!_showResults}>
                        ${results.map(
                            res => html`
                                <div class="tag tap" @click=${() => this._addTag(res)}>
                                    <pl-icon icon="tag"></pl-icon>

                                    <div>${res}</div>
                                </div>
                            `
                        )}
                    </div>
                </div>
            </div>
        `;
    }

    private _addTag(tag: Tag) {
        if (!tag || this.tags.includes(tag)) {
            return;
        }
        this.tags.push(tag);
        this._input.value = "";
        this._showResults = false;
        this.requestUpdate();
    }

    private _tagClicked(tag: Tag) {
        if (this.editing) {
            this.tags = this.tags.filter(t => t !== tag);
        }
    }

    private _vaultClicked() {
        this.dispatch("move");
    }

    _focusChanged() {
        clearTimeout(this._focusTimeout);
        setTimeout(() => (this._showResults = this._input.focused), this._input.focused ? 0 : 200);
    }
}
