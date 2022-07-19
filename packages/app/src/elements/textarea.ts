import autosize from "autosize";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BaseInput } from "./base-input";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("pl-textarea")
export class Textarea extends BaseInput {
    @property({ type: Boolean })
    autosize: boolean = false;

    updated() {
        if (this.autosize) {
            setTimeout(() => autosize.update(this._inputElement));
        }
    }

    async connectedCallback() {
        super.connectedCallback();
        this.addEventListener("keydown", (e: KeyboardEvent) => this._keydown(e));
        if (this.autosize) {
            await this.updateComplete;
            autosize(this._inputElement);
        }
    }

    static styles = [
        ...BaseInput.styles,
        css`
            textarea {
                overflow-wrap: break-word;
                border: none;
                background: transparent;
                appearance: none;
                -webkit-appearance: none;
                resize: none;
                color: inherit;
            }

            textarea[nowrap] {
                white-space: pre;
                word-wrap: normal;
                overflow-x: scroll;
            }
        `,
    ];

    protected _keydown(e: KeyboardEvent) {
        e.stopPropagation();
    }

    _renderInput() {
        const { placeholder, readonly, noTab, disabled, autocapitalize, required } = this;

        return html`
            <textarea
                id="${this._inputId}"
                class="input-element"
                .placeholder=${placeholder}
                tabindex=${ifDefined(noTab ? -1 : undefined)}
                ?readonly=${readonly}
                ?disabled=${disabled}
                ?required=${required}
                autocapitalize=${autocapitalize as any}
                autocomplete="off"
                spellcheck="false"
                autocomplete="off"
                rows="1"
                @focus=${this._focused}
                @blur=${this._blurred}
                @change=${this._changeHandler}
                @touchend=${this._touchend}
            ></textarea>
        `;
    }
}
