import { Field } from "@padloc/core/lib/vault.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared } from "../styles";
import { dialog } from "../dialog.js";
import { BaseElement, element, html, property, query } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
import { Generator } from "./generator.js";

@element("pl-field")
export class FieldElement extends BaseElement {
    @property()
    field: Field | null = null;
    @property()
    editing: boolean = false;

    get name() {
        return this._nameInput.value;
    }

    get value() {
        return this._valueInput.value;
    }

    @query("#nameInput")
    private _nameInput: Input;

    @query("#valueInput")
    private _valueInput: Input;

    @dialog("pl-generator")
    private _generator: Generator;

    shouldUpdate() {
        return !!this.field;
    }

    render() {
        const field = this.field!;
        let inputType: string;
        switch (field.type) {
            case "email":
            case "url":
            case "date":
            case "month":
                inputType = field.type;
                break;
            case "phone":
                inputType = "tel";
                break;
            default:
                inputType = "text";
        }
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

                .field-name {
                    font-size: var(--font-size-tiny);
                    font-weight: bold;
                    color: var(--color-highlight);
                    padding: 0 10px;
                }

                .field-name:not([readonly]) {
                    margin-bottom: 4px;
                }

                .field-value {
                    font-family: var(--font-family-mono);
                    font-size: 110%;
                    flex: 1;
                    padding: 0 10px;
                    opacity: 1;
                    --rule-width: 1px;
                }

                pl-input {
                    height: auto;
                    line-height: 30px;
                    box-sizing: border-box;
                }

                pl-input:not([readonly]), .add-button {
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
                    ?hidden=${ field.type !== "password" }
                    icon="generate"
                    class="tap"
                    @click=${() => this._generateValue()}>
                </pl-icon>

            </div>

            <div class="flex">

                <pl-input class="field-name"
                    id="nameInput"
                    placeholder="${$l("Field Name")}"
                    .value=${field.name}
                    ?readonly=${!this.editing}>
                </pl-input>

                <pl-input
                    id="valueInput"
                    class="field-value"
                    placeholder="${$l("Field Content")}"
                    .value=${field.value}
                    .type=${inputType}
                    .multiLine=${field.type === "note"}
                    .readonly=${!this.editing}
                    .masked=${field.type === "password" && !this.editing}
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
                    icon="hide"
                    class="tap"
                    ?hidden=${ field.type !== "password" }
                    @click=${() => this._toggleMask()}>
                </pl-icon>

            </div>
        `;
    }

    _toggleMask() {
        this._valueInput.masked = !this._valueInput.masked;
    }

    private async _generateValue() {
        const value = await this._generator.show();
        if (value) {
            this._valueInput.value = value;
        }
    }
}
