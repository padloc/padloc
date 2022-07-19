import { Tag } from "@padloc/core/src/item";
import { $l } from "@padloc/locale/src/translate";
import { css, customElement, html, LitElement, property, query } from "lit-element";
import { app, router } from "../globals";
import { shared } from "../styles";

@customElement("pl-tags-input")
export class TagsInput extends LitElement {
    @property({ attribute: false })
    tags: Tag[] = [];

    @property({ type: Boolean, reflect: true })
    readonly = false;

    focus() {
        this._input.focus();
    }

    @query("input")
    private _input: HTMLInputElement;

    @query(".results")
    private _results: HTMLDivElement;

    connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener("focus", () => this._focus());
        this.addEventListener("blur", () => this._blur());
    }

    private _keydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            this._addTag(this._input.value);
        }
    }

    private async _addTag(tag: Tag) {
        if (!tag || this.tags.some((t) => t === tag)) {
            return;
        }
        this.tags.push(tag);
        this._input.value = "";
        this.requestUpdate();
        await this.updateComplete;
        this._input.focus();
    }

    private _tagClicked(tag: Tag) {
        if (this.readonly) {
            router.go("items", { tag });
        } else {
            this.tags = this.tags.filter((t) => t !== tag);
        }
    }

    private _hideResultsTimeout: number;

    private _focus() {
        window.clearTimeout(this._hideResultsTimeout);
        this._results.style.display = "";
        this.classList.add("focused");
    }

    private _blur() {
        this.classList.remove("focused");
        this._hideResultsTimeout = window.setTimeout(() => (this._results.style.display = "none"), 150);
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 0.3em;
                flex-wrap: wrap;
                border: solid 1px var(--input-border-color);
                border-radius: 0.5em;
                position: relative;
                z-index: 1;
                overflow: visible;
                padding: 0.3em;
            }

            input {
                padding: 0.15em;
                border: none;
                background: none;
                width: 100%;
            }

            :host([readonly]) {
                border-color: transparent;
            }

            :host(.focused) {
                border-color: var(--input-focused-border-color);
            }

            :host(:not(.focused)) i.plus {
                opacity: 0.5;
            }

            .results {
                position: absolute;
                background: var(--color-background);
                box-shadow: rgba(0, 0, 0, 0.1) 0 0.3em 1em -0.2em, var(--border-color) 0 0 0 1px;
                width: 100%;
                border-radius: 0.5em;
                margin-top: 0.2em;
                box-sizing: border-box;
                transition: pointer-events 0.5s;
                max-width: 15em;
                overflow: hidden;
            }

            .add-tag {
                overflow: visible;
                position: relative;
                font-size: 0.9em;
            }

            :host([readonly]) .remove-icon,
            .tag:not(:hover) > .remove-icon {
                display: none;
            }
        `,
    ];

    render() {
        const existingTags = app.state.tags;
        const value = this._input?.value || "";
        const results = existingTags.filter(
            ([t]) => !this.tags.includes(t) && t !== value && t.toLowerCase().startsWith(value.toLocaleLowerCase())
        );
        if (value) {
            results.push([value, 0]);
        }

        return html`
            ${this.tags.map(
                (tag) => html`
                    <div class="small tag click hover" @click=${() => this._tagClicked(tag)}>
                        <pl-icon icon="tag" class="inline"></pl-icon>
                        ${tag}
                        <pl-icon icon="cancel" class="inline small remove-icon"></pl-icon>
                    </div>
                `
            )}

            <div class="smaller add-tag">
                <div class="center-aligning horizontal layout">
                    <pl-icon class="subtle" icon="add"></pl-icon>

                    <input
                        class="stretch"
                        placeholder="Add Tag..."
                        @keydown=${this._keydown}
                        @input=${() => this.requestUpdate()}
                    />
                </div>

                <pl-list class="results" style="display: none">
                    ${results.length
                        ? results.map(
                              ([tag, count]) => html`
                                  <div
                                      class="padded half-spacing center-aligning horizontal layout list-item click hover"
                                      @click=${() => this._addTag(tag)}
                                  >
                                      <pl-icon icon="tag"></pl-icon>
                                      <div class="stretch">${tag}</div>
                                      <div class="small subtle right-margined">
                                          ${count || html`<pl-icon class="inline" icon="add"></pl-icon>`}
                                      </div>
                                  </div>
                              `
                          )
                        : html` <div class="smaller padded subtle">${$l("Type tag name...")}</div> `}
                </pl-list>
            </div>
        `;
    }
}
