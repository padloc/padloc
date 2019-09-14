// @ts-ignore
import autosize from "autosize/src/autosize";
import { element, html, property } from "./base";
import { BaseInput } from "./base-input";

@element("pl-textarea")
export class Textarea extends BaseInput {
    @property()
    autosize: boolean = false;

    updated() {
        console.log("updated");
        if (this.autosize) {
            setTimeout(() => autosize(this._inputElement));
        }
    }

    checkValidity() {
        return true;
    }

    _renderInput() {
        const { placeholder, readonly, noTab, disabled, autocapitalize, required } = this;

        return html`
            <textarea
                id="input"
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
                @focus=${(e: FocusEvent) => this._focused(e)}
                @blur=${(e: FocusEvent) => this._blurred(e)}
            ></textarea>
        `;
    }
}
