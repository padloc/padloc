import { FieldType, FIELD_DEFS } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import { BaseElement, element, html, css, property, query, observe } from "./base";
import "./icon";
import { Input } from "./input";
import { Textarea } from "./textarea";
import "./input";
import "./textarea";
import "./totp";

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

    @property()
    private _masked: boolean = false;

    @query(".name-input")
    private _nameInput: Input;

    @query(".value-input")
    private _valueInput: Input | Textarea;

    private get _fieldDef() {
        return FIELD_DEFS[this.type] || FIELD_DEFS.text;
    }

    private get _fieldActions() {
        const actions = [{ icon: "copy", action: () => this.dispatch("copy") }];

        if (this._fieldDef.mask) {
            actions.push({ icon: this._masked ? "show" : "hide", action: () => this._masked = !this._masked });
        }

        return actions;
    }

    focus() {
        const inputToFocus = this._nameInput.value ? this._valueInput : this._nameInput;
        inputToFocus.focus();
    }

    @observe("type")
    _typeChanged() {
        this._masked = this._fieldDef.mask;
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                border-radius: 8px;
                min-height: 80px;
            }

            .field-buttons {
                display: flex;
                flex-direction: column;
                margin: 4px;
            }

            .field-buttons.right {
                margin-left: -4px;
            }

            .field-buttons.left {
                margin-right: -4px;
            }

            :host(:not(:hover)) .field-buttons.right {
                visibility: hidden;
            }

            .field-header {
                display: flex;
                margin-bottom: 4px;
                font-size: var(--font-size-tiny);
                font-weight: bold;
                color: var(--color-highlight);
                align-items: center;
                position: relative;
            }

            .field-header pl-icon {
                border-radius: 0;
                font-size: 10px;
                width: 10px;
                height: 11px;
                position: absolute;
                left: 8px;
                top: 8px;
            }

            .field-value {
                display: flex;
            }

            .field-value > :not(:first-child) {
                margin-left: 4px;
            }

            .value-input, .value-display {
                font-family: var(--font-family-mono);
                font-size: 110%;
                padding: 4px 8px;
                line-height: 1.4em;
                flex: 1;
                width: 0;
            }

            .value-display {
                white-space: normal;
                overflow-wrap: break-word;
            }

            .fields-container {
                margin: 8px;
                width: 0;
            }

            .name-input {
                flex: 1;
                min-width: 0;
                padding: 0 10px 0 24px;
                line-height: 30px;
            }

            .name-input, .value-input {
                height: auto;
                box-sizing: border-box;
                background: none;
                border: dashed 1px var(--color-shade-2);
            }

            .name-input[readonly] {
                border: none;
            }

            .drag-handle {
                cursor: grab;
            }

            .drag-handle:active {
                cursor: grabbing;
            }

            @media (hover: none) {
                .drag-handle {
                    display: none;
                }
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .field-header pl-icon {
                    top: 11px;
                }
            }
        `
    ];

    private _renderDisplayValue() {
        const format = this._fieldDef.format || ((value: string, _masked: boolean) => value);
        switch (this.type) {
            case "totp":
                return html`
                    <pl-totp class="value-display" .secret=${this.value} .time=${Date.now()}></pl-totp>
                `;
            default:
                return html`
                    <pre class="value-display">${format(this.value, this._masked)}</pre>
                `;
        }
    }

    private _renderEditValue() {
        switch (this.type) {
            case "note":
                return html`
                    <pl-textarea
                        class="value-input"
                        .placeholder=${$l("Enter Field Value")}
                        @input=${() => (this.value = this._valueInput.value)}
                        autosize
                        .value=${this.value}
                    >
                    </pl-textarea>
                `;

            case "totp":
                return html`
                    <pl-input
                        class="value-input"
                        .placeholder=${$l("Enter Secret")}
                        type="text"
                        @input=${() => (this.value = this._valueInput.value)}
                        .value=${this.value}
                    >
                    </pl-input>
                    <pl-icon icon="qrcode" class="tap" @click=${() => this.dispatch("get-totp-qr")}></pl-icon>
                `
            case "password":
                return html`
                    <pl-input
                        class="value-input"
                        .placeholder=${$l("Enter Password")}
                        type="text"
                        @input=${() => (this.value = this._valueInput.value)}
                        .value=${this.value}
                    >
                    </pl-input>
                    <pl-icon icon="generate" class="tap" @click=${() => this.dispatch("generate")}></pl-icon>
                `

            default:
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
                return html`
                    <pl-input
                        class="value-input"
                        .placeholder=${$l("Enter Field Value")}
                        .type=${inputType}
                        .pattern=${this._fieldDef.pattern}
                        @input=${() => (this.value = this._valueInput.value)}
                        .value=${this.value}
                    >
                    </pl-input>
                `;
        }
    }

    render() {
        return html`
            <div class="field-buttons left" ?hidden=${!this.editing}>
                <pl-icon
                    icon="menu"
                    class="drag-handle"
                    @mouseover=${() => this.setAttribute("draggable", "true")}
                    @mouseout=${() => this.removeAttribute("draggable")}
                >
                </pl-icon>

                <pl-icon icon="remove" class="tap" @click=${() => this.dispatch("remove")}> </pl-icon>
            </div>

            <div class="fields-container flex">
                <div class="field-header">
                    <pl-icon icon="${this._fieldDef.icon}"></pl-icon>

                    <pl-input
                        class="name-input"
                        placeholder="${this.editing ? $l("Enter Field Name") : $l("Unnamed")}"
                        .value=${this.name}
                        @input=${() => (this.name = this._nameInput.value)}
                        ?readonly=${!this.editing}
                    >
                    </pl-input>
                </div>

                <div class="field-value">
                    ${ this.editing ? this._renderEditValue() : this._renderDisplayValue() }
                </div>
            </div>

            <div class="field-buttons right" ?hidden=${this.editing}>

                ${this._fieldActions.map(
                    ({ icon, action }) => html`
                        <pl-icon icon=${icon} class="tap" @click=${action}></pl-icon>
                    `
                )}

            </div>
        `;
    }
}
