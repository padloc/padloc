import { FieldType, FieldDef, FIELD_DEFS } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";
import "./icon.js";
import { Input } from "./input.js";
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

    focus() {
        const inputToFocus = this._nameInput.value ? this._valueInput : this._nameInput;
        inputToFocus.focus();
    }

    updated(changes: Map<string, any>) {
        // workaround for issue where string fails to be set if
        // type was previously a number type. This gives the
        // renderer time to update the input type first.
        if (changes.get("type")) {
            setTimeout(() => {
                this._valueInput.value = this.value;
            }, 10);
        }
    }

    render() {
        const fieldDef = FIELD_DEFS[this.type] || FIELD_DEFS.text;
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

                .field-buttons.left {
                    margin: 0 -4px 0 4px;
                }

                :host(:not(:hover)) .field-buttons.right {
                    visibility: hidden;
                }

                .field-header {
                    display: flex;
                    margin-bottom: 4px;
                }

                .fields-container {
                    margin: 8px;
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

                pl-input[readonly] {
                    background: transparent;
                }
            </style>

            <div class="field-buttons left" ?hidden=${!this.editing}>

                <pl-icon
                    icon="remove"
                    class="tap"
                    @click=${() => this.dispatch("remove")}>
                </pl-icon>

                <pl-icon
                    ?hidden=${this.type !== "password"}
                    icon="generate"
                    class="tap"
                    @click=${() => this.dispatch("generate")}>
                </pl-icon>

            </div>

            <div class="fields-container flex">

                <div class="field-header">

                    <pl-input class="field-name"
                        id="nameInput"
                        placeholder="${$l("Enter Field Name")}"
                        .value=${this.name}
                        @input=${() => (this.name = this._nameInput.value)}
                        @click=${() => !this._nameInput.value && this.dispatch("edit")}
                        ?readonly=${!this.editing}>
                    </pl-input>

                    <pl-select
                        id="typeSelect"
                        class="field-type"
                        tabindex="-1"
                        ?hidden=${!this.editing}
                        .options=${Object.values(FIELD_DEFS)}
                        .selected=${fieldDef}
                        @change=${() => (this.type = this._typeSelect.selected!.type)}>
                    </pl-select>

                </div>

                <pl-input
                    id="valueInput"
                    class="field-value"
                    placeholder="${$l("Enter Field Value")}"
                    .type=${inputType}
                    multiline
                    .readonly=${!this.editing}
                    .masked=${mask}
                    .value=${this.value}
                    @input=${() => (this.value = this._valueInput.value)}
                    @click=${() => !this._valueInput.value && this.dispatch("edit")}
                    autosize>
                </pl-input>

            </div>

            <div class="field-buttons right" ?hidden=${this.editing}>

                <pl-icon
                    .icon=${(this._valueInput ? this._valueInput.masked : mask) ? "show" : "hide"}
                    class="tap"
                    ?hidden=${!fieldDef.mask}
                    @click=${() => this._toggleMask()}>
                </pl-icon>

                <pl-icon
                    icon="copy"
                    class="tap"
                    @click=${() => this.dispatch("copy")}>
                </pl-icon>

            </div>
        `;
    }

    _toggleMask() {
        this._valueInput.masked = !this._valueInput.masked;
        this.requestUpdate();
    }
}
