import { element, html, listen, property } from "./base";
import { BaseInput } from "./base-input";

@element("pl-input")
export class Input extends BaseInput {
    @property()
    type: string = "";

    @property()
    pattern: string = "";

    get validationMessage() {
        return this._inputElement.validationMessage;
    }

    @listen("keydown")
    _keydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            this.checkValidity();
            this.dispatch("enter");
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key === "Escape") {
            this.dispatch("escape");
            e.preventDefault();
            e.stopPropagation();
        }
    }

    _renderInput() {
        const { placeholder, readonly, noTab, disabled, autocapitalize, required, type, pattern } = this;

        return html`
            <input
                class="input-element"
                .placeholder=${placeholder}
                ?readonly=${readonly}
                .tabIndex=${noTab ? "-1" : ""}
                ?disabled=${disabled}
                autocapitalize="${autocapitalize ? "" : "off"}"
                ?required=${required}
                autocomplete="off"
                spellcheck="false"
                autocorrect="off"
                type="${type}"
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
