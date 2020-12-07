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
import "./button";

@element("pl-field")
export class FieldElement extends BaseElement {
    @property()
    editing: boolean = false;

    @property()
    name: string = "";

    @property()
    value: string = "";

    @property()
    type: FieldType = FieldType.Note;

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
        const actions = [{ icon: "copy", action: () => this.dispatch("copy-clipboard") }];

        if (this._fieldDef.mask) {
            actions.push({ icon: this._masked ? "show" : "hide", action: () => (this._masked = !this._masked) });
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

    @observe("editing")
    _editingChanged() {
        if (!this.editing) {
            this.setAttribute("draggable", "true");
        } else {
            this.removeAttribute("draggable");
        }
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                border-radius: 0.5em;
                opacity: 0.999;
                position: relative;
                background: var(--color-background);
            }

            :host(:not(:hover)) .field-actions {
                visibility: hidden;
            }

            .field-header {
                font-weight: bold;
                color: var(--color-highlight);
                --input-padding: 0.3em;
                margin: 0.3em 0 0.2em 0.7em;
            }

            .value-input,
            .value-display {
                font-family: var(--font-family-mono);
                line-height: 1.4em;
            }

            .value-input {
                --input-padding: 0.3em 0.5em;
            }

            .value-display {
                padding: 0.3em 0.5em;
                white-space: pre-wrap;
                overflow-wrap: break-word;
                user-select: text;
                cursor: text;
            }

            .value-input {
                border: dashed 1px var(--color-shade-2);
            }

            :host([draggable]),
            :host([draggable]) .name-input {
                cursor: grab;
            }

            :host([draggable]):active {
                cursor: grabbing;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .drag-handle {
                    display: none;
                }
            }
        `,
    ];

    private _renderDisplayValue() {
        const format = this._fieldDef.format || ((value: string, _masked: boolean) => value);
        switch (this.type) {
            case "totp":
                return html` <pl-totp class="value-display" .secret=${this.value} .time=${Date.now()}></pl-totp> `;
            default:
                return html` <pre class="value-display">${format(this.value, this._masked)}</pre> `;
        }
    }

    private _renderEditValue() {
        switch (this.type) {
            case "note":
                return html`
                    <pl-textarea
                        class="value-input"
                        .placeholder=${$l("Enter Notes Here")}
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
                        <pl-button
                            class="small transparent round"
                            slot="after"
                            @click=${() => this.dispatch("get-totp-qr")}
                        >
                            <pl-icon icon="qrcode"></pl-icon>
                        </pl-button>
                    </pl-input>
                `;
            case "password":
                return html`
                    <pl-input
                        class="value-input"
                        .placeholder=${$l("Enter Password")}
                        type="text"
                        @input=${() => (this.value = this._valueInput.value)}
                        .value=${this.value}
                    >
                        <pl-button
                            class="small transparent round"
                            slot="after"
                            @click=${() => this.dispatch("generate")}
                        >
                            <pl-icon icon="generate"></pl-icon>
                        </pl-button>
                    </pl-input>
                `;

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
                        .placeholder=${$l("Enter Value Here")}
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
            <div class="horizontal layout">
                <div class="vertical centering layout" ?hidden=${!this.editing}>
                    <pl-icon
                        icon="menu"
                        class="padded drag-handle"
                        @mouseover=${() => this.setAttribute("draggable", "true")}
                        @mouseout=${() => this.removeAttribute("draggable")}
                    >
                    </pl-icon>

                    <pl-button class="transparent slim round">
                        <pl-icon icon="remove" @click=${() => this.dispatch("remove")}> </pl-icon>
                    </pl-button>
                </div>

                <div class="margined collapse stretch">
                    <div class="field-header">
                        <pl-input
                            class="transparent small name-input"
                            placeholder="${this.editing ? $l("Enter Field Name") : $l("Unnamed")}"
                            .value=${this.name}
                            @input=${() => (this.name = this._nameInput.value)}
                            ?readonly=${!this.editing}
                        >
                            <pl-icon icon="${this._fieldDef.icon}" class="small" slot="before"></pl-icon>
                        </pl-input>
                    </div>

                    <div class="large field-value">
                        ${this.editing ? this._renderEditValue() : this._renderDisplayValue()}
                    </div>
                </div>

                <div class="half-margined vertical layout field-actions" ?hidden=${this.editing}>
                    ${this._fieldActions.map(
                        ({ icon, action }) => html`
                            <pl-button class="transparent slim round" @click=${action}>
                                <pl-icon icon=${icon}></pl-icon>
                            </pl-button>
                        `
                    )}
                </div>
            </div>
        `;
    }
}
