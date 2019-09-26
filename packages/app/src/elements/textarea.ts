// @ts-ignore
import autosize from "autosize/src/autosize";
import { element, html, property } from "./base";
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

    _renderInput() {
        const { placeholder, readonly, noTab, disabled, autocapitalize, required } = this;

        return html`
            <textarea
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
