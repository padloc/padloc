// @ts-ignore
import autosize from "autosize/src/autosize";
import { element, html, property, css, listen } from "./base";
import { BaseInput } from "./base-input";

@element("pl-textarea")
export class Textarea extends BaseInput {
    @property()
    autosize: boolean = false;

    updated() {
        if (this.autosize) {
            setTimeout(() => autosize(this._inputElement));
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
            }

            textarea[nowrap] {
                white-space: pre;
                word-wrap: normal;
                overflow-x: scroll;
            }
        `,
    ];

    @listen("keydown", this)
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
                .tabIndex=${noTab ? "-1" : ""}
                ?readonly=${readonly}
                ?disabled=${disabled}
                ?required=${required}
                autocapitalize=${autocapitalize}
                autocomplete="off"
                spellcheck="false"
                autocorrect="off"
                rows="1"
                @focus=${this._focused}
                @blur=${this._blurred}
                @change=${this._changeHandler}
                @touchend=${this._touchend}
            ></textarea>
        `;
    }
}
