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
                margin-top: -0.5em;
            }

            .wrapper > * {
                margin-top: 0.5em;
            }

            .results {
                padding: 0;
                border-radius: 8px;
                margin-top: 0;
                flex-direction: column;
                align-items: flex-start;
            }

            .results .tag {
                margin-top: 0.5em;
            }

            .add-tag {
                overflow: visible;
                height: 2.4em;
            }
        `,
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
                <div
                    class="tag highlight tap center-aligning spacing horizontal layout"
                    @click=${() => this._vaultClicked()}
                >
                    <pl-icon icon="vault"></pl-icon>

                    <div class="tag-name">${vault}</div>
                </div>

                ${tags.map(
                    (tag) => html`
                        <div
                            class="tap tag center-aligning spacing horizontal layout"
                            @click=${() => this._tagClicked(tag)}
                        >
                            <pl-icon icon="tag"></pl-icon>

                            <div>${tag}</div>

                            ${editing ? html` <pl-icon icon="cancel"></pl-icon> ` : ""}
                        </div>
                    `
                )}

                <div class="add-tag" ?hidden=${!editing}>
                    <pl-input
                        class="skinny dashed"
                        .placeholder=${$l("Add Tag")}
                        @enter=${() => this._addTag(value)}
                        @input=${() => this.requestUpdate()}
                        @focus=${() => this._focusChanged()}
                        @blur=${() => this._focusChanged()}
                    >
                        <pl-icon icon="add" slot="before"></pl-icon>
                    </pl-input>

                    <div class="tags results" ?hidden=${!_showResults}>
                        ${results.map(
                            (res) => html`
                                <div
                                    class="tag tap center-aligning spacing horizontal layout"
                                    @click=${() => this._addTag(res)}
                                >
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
            this.tags = this.tags.filter((t) => t !== tag);
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
