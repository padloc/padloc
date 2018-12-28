import { FieldType, FieldDef, FIELD_DEFS } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared } from "../styles";
import { dialog } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { Generator } from "./generator.js";
import { Select } from "./select.js";

@element("pl-field")
export class FieldElement extends BaseElement {
    @property()
    editing: boolean = false;

    @property()
    name: string = "";

    @property()
    value: string = "";

    @property()
    type: FieldType = "note";

    @query("#nameInput")
    private _nameInput: Input;

    @query("#valueInput")
    private _valueInput: Input;

    @query("#typeSelect")
    private _typeSelect: Select<FieldDef>;

    @dialog("pl-generator")
    private _generator: Generator;

    focus() {
        const inputToFocus = this._nameInput.value ? this._valueInput : this._nameInput;
        inputToFocus.focus();
    }

    render() {
        const fieldDef = FIELD_DEFS[this.type];
        let inputType: string;
        switch (this.type) {
            case "email":
            case "url":
            case "date":
            case "month":
                inputType = this.type;
                break;
            case "pin":
            case "credit":
                inputType = "number";
                break;
            case "phone":
                inputType = "tel";
                break;
            default:
                inputType = "text";
        }
        const mask = fieldDef.mask && !this.editing;
        return html`
            ${shared}

            <style>
                :host {
                    display: flex;
                    align-items: center;
                    border-radius: 8px;
                    min-height: 80px;
                }

                .field-buttons {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                :host(:not(:hover)) .field-buttons.right {
                    visibility: hidden;
                }

                .field-header {
                    display: flex;
                    margin-bottom: 4px;
                }

                .field-name {
                    flex: 1;
                    min-width: 0;
                    font-size: var(--font-size-tiny);
                    font-weight: bold;
                    color: var(--color-highlight);
                    padding: 0 10px;
                }

                .field-type {
                    width: 95px;
                    font-weight: bold;
                    margin-left: 4px;
                    padding: 0;
                    padding-left: 10px;
                    font-size: var(--font-size-micro);
                    color: var(--color-gradient-warning-to);
                }

                .field-value {
                    font-family: var(--font-family-mono);
                    font-size: 110%;
                    flex: 1;
                    padding: 0 10px;
                    opacity: 1;
                    --rule-width: 1px;
                }

                pl-input,
                pl-select {
                    height: auto;
                    line-height: 30px;
                    box-sizing: border-box;
                }

                pl-input:not([readonly]),
                pl-select {
                    background: #fafafa;
                    border: solid 1px #eee;
                    border-radius: 8px;
                }
            </style>

            <div class="field-buttons" ?hidden=${!this.editing}>

                <pl-icon
                    icon="remove"
                    class="tap"
                    @click=${() => this.dispatch("remove")}>
                </pl-icon>

                <pl-icon
                    ?hidden=${ this.type !== "password" }
                    icon="generate"
                    class="tap"
                    @click=${() => this._generateValue()}>
                </pl-icon>

            </div>

            <div class="flex">

                <div class="field-header">

                    <pl-input class="field-name"
                        id="nameInput"
                        placeholder="${$l("Enter Field Name")}"
                        .value=${this.name}
                        @input=${() => this.name = this._nameInput.value}
                        @click=${() => !this._nameInput.value && this.dispatch("edit")}
                        ?readonly=${!this.editing}>
                    </pl-input>

                    <pl-select
                        id="typeSelect"
                        class="field-type"
                        tabindex="-1"
                        ?hidden=${ !this.editing }
                        .options=${ Object.values(FIELD_DEFS) }
                        .selected=${fieldDef}
                        @change=${() => this.type = this._typeSelect.selected!.type }>
                    </pl-select>

                </div>

                <pl-input
                    id="valueInput"
                    class="field-value"
                    placeholder="${$l("Enter Field Value")}"
                    .value=${this.value}
                    .type=${inputType}
                    .multiline=${fieldDef.multiline}
                    .readonly=${!this.editing}
                    .masked=${mask}
                    @input=${() => this.value = this._valueInput.value}
                    @click=${() => !this._valueInput.value && this.dispatch("edit")}
                    autosize>
                </pl-input>

            </div>

            <div class="field-buttons right" ?hidden=${this.editing}>

                <pl-icon
                    icon="copy"
                    class="tap"
                    @click=${() => this.dispatch("copy")}>
                </pl-icon>

                <pl-icon
                    .icon=${ (this._valueInput ? this._valueInput.masked : mask ) ? "show" : "hide" }
                    class="tap"
                    ?hidden=${ this.type !== "password" }
                    @click=${() => this._toggleMask()}>
                </pl-icon>

            </div>
        `;
    }

    _toggleMask() {
        this._valueInput.masked = !this._valueInput.masked;
        this.requestUpdate();
    }

    private async _generateValue() {
        const value = await this._generator.show();
        if (value) {
            this.value = value;
        }
    }
}
