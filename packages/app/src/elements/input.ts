import { html, css } from "lit";
import { customElement, property } from "lit/decorators";
import { BaseInput } from "./base-input";

@customElement("pl-input")
export class Input extends BaseInput {
    @property()
    type: string = "";

    @property()
    pattern: string = "";

    get validationMessage() {
        return this._inputElement.validationMessage;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("keydown", (e: KeyboardEvent) => this._keydown(e));
    }

    _keydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            this.checkValidity();
            this.dispatchEvent(new CustomEvent("enter"));
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key === "Escape") {
            this.dispatchEvent(new CustomEvent("escape"));
            e.preventDefault();
            e.stopPropagation();
        }
    }

    static styles = [
        ...BaseInput.styles,
        css`
            input {
                box-sizing: border-box;
                text-overflow: ellipsis;
                box-shadow: none;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                input[type="date"],
                input[type="month"] {
                    display: block;
                    min-height: 1.5em;
                }
            }
        `,
    ];

    _renderInput() {
        const { placeholder, readonly, noTab, disabled, autocapitalize, required, type, pattern } = this;

        return html`
            <input
                id=${this._inputId}
                class="input-element"
                .placeholder=${placeholder}
                ?readonly=${readonly}
                .tabIndex=${noTab || readonly ? -1 : NaN}
                ?disabled=${disabled}
                autocapitalize="${autocapitalize ? "on" : "off"}"
                ?required=${required}
                autocomplete="off"
                spellcheck="false"
                autocomplete="off"
                type="${type as any}"
                pattern="${pattern || ".*"}"
                @focus=${this._focused}
                @blur=${this._blurred}
                @change=${this._changeHandler}
                @touchend=${this._touchend}
            />
        `;
    }

    checkValidity() {
        return this._inputElement && this._inputElement.checkValidity();
    }

    reportValidity() {
        return this._inputElement && this._inputElement.reportValidity();
    }
}
