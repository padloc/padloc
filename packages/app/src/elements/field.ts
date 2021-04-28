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
import { app } from "../globals";

const crypto = require('crypto');

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

    @property()  // number of times user password has been detected in a data breach
    _passwordBreachCount: number = -1;

    @property()  // list of missing properties that would make the user password strongest
    _missingList: string[] = [];

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
                display: flex;
                border-radius: 8px;
                min-height: 80px;
                opacity: 0.999;
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

            .value-input,
            .value-display {
                font-family: var(--font-family-mono);
                font-size: 110%;
                padding: 4px 8px;
                line-height: 1.4em;
                flex: 1;
                width: 0;
            }

            .value-display {
                white-space: pre-wrap;
                overflow-wrap: break-word;
                user-select: text;
                cursor: text;
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

            .name-input,
            .value-input {
                height: auto;
                box-sizing: border-box;
                background: none;
            }

            .value-input {
                border: dashed 1px var(--color-shade-2);
            }
            /* input field style for strong password */         
            .value-strong {
                border: solid 2px var(--validate-strong);
            }
                        
            /* input field style for a good password */
            .value-good {
                border: solid 2px var(--validate-good);
            }
            
            /* input field style for an okay password */
            .value-okay {
               border: solid 2px var(--validate-okay);
            }
            
            /* input field style for a weak password */
            .value-weak {   
                border: solid 2px var(--validate-weak);
            }

            .name-input[readonly] {
                border: none;
            }

            :host([draggable]),
            :host([draggable]) .name-input {
                cursor: grab;
            }

            :host([draggable]):active {
                cursor: grabbing;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                .field-header pl-icon {
                    top: 11px;
                }

                .drag-handle {
                    display: none;
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

    /**
     * Checks against HIBP's API for the number of times the user's password has been detected in a breach.
     * @private
     */
    private async _checkPasswordBreach() {
        if (!this.value) {
            this._passwordBreachCount = -1;
            return;
        }

        const sha1Hash = crypto.createHash("sha1")
            .update(this.value)
            .digest("hex");

        try {
            const response = await app.getPasswordBreachStatus(sha1Hash);
            this._passwordBreachCount = response.count;
        } catch (error) {
            console.error(error);
            this._passwordBreachCount = -1;
        }
    }

    /**
     * Get the CSS style class for an input field, based on the strength of the password in this field.
     * Password strength is computed by checking for uppercase characters, lowercase characters, special
     * characters, and numbers.
     * @private
     */
    private _getPasswordStrengthClass(): string {
        this._missingList = [];
        if (!this.value) {
            return "value-input";
        }

        let strength = 0;

        // check password length
        if (this.value.length > 15) {
            strength += 4;
        } else if (this.value.length > 10) {
            strength += 2;
        } else if (this.value.length > 5) {
            strength += 1;
        }

        // check for uppercase
        const containsUppercase = (/[A-Z]/g).test(this.value);
        if (containsUppercase) {
            strength += 2;
        } else {
            this._missingList.push("uppercase letter");
        }

        // check for lowercase
        const containsLowercase = (/[a-z]/g).test(this.value);
        if (containsLowercase) {
            strength += 2;
        } else {
            this._missingList.push("lowercase letter");
        }

        // check for number
        const containsNumber = (/\d/g).test(this.value);
        if (containsNumber) {
            strength += 2;
        } else {
            this._missingList.push("number");
        }

        // check for special character
        const containsSpecial = (/[-+_!@#$%^&*.,?;]/g).test(this.value);
        if (containsSpecial) {
            strength += 2;
        } else {
            this._missingList.push("special character");
        }

        if (strength >= 12) {
            return "value-input value-strong";
        } else if (strength > 8) {
            return "value-input value-good";
        } else if (strength > 6) {
            return "value-input value-okay";
        }

        return "value-input value-weak";
    }

    /**
     * Renders the text within the vault item for the user with password breach information and strength recommendations
     * @private
     */
    private _renderFieldHelpText() {
        switch(this.type) {
            case "password":
                const missingStr = this._missingList.length > 0
                    ? html`<p>Add the following attribute(s) to strengthen your password: <b>${this._missingList.join(", ")}</b></p>`
                    : null;

                if (this._passwordBreachCount > 0) {
                    return html`
                        <p>This password has been detected in <b>${this._passwordBreachCount}</b> breaches! It is recommended to change your password.</p>
                        ${missingStr}`;
                } else if (this._passwordBreachCount === 0) {
                    return html`
                        <p>This password has not been detected in any breaches!</p>
                        ${missingStr}`;
                } else {
                    return missingStr;
                }

            default:
                return null;
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
                    </pl-input>
                    <pl-icon icon="qrcode" class="tap" @click=${() => this.dispatch("get-totp-qr")}></pl-icon>
                `;
            case "password":
                const inputClass = this._getPasswordStrengthClass();
                return html`
                    <pl-input
                        class=${inputClass}
                        .placeholder=${$l("Enter Password")}
                        type="text"
                        @input=${() => (this.value = this._valueInput.value)}
                        @blur=${this._checkPasswordBreach}
                        .value=${this.value}
                    >
                    </pl-input>
                    <pl-icon icon="generate" class="tap" @click=${() => this.dispatch("generate")}></pl-icon>`;

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
                    ${this.editing ? this._renderEditValue() : this._renderDisplayValue()}
                </div>

                ${this._renderFieldHelpText()}
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
