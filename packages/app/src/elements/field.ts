import { FieldType, FieldDef, FIELD_DEFS } from "@padloc/core/lib/item.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { totp } from "@padloc/core/lib/otp.js";
import { base32ToBytes } from "@padloc/core/lib/encoding.js";
import { shared } from "../styles";
import { BaseElement, element, html, svg, css, property, query, observe } from "./base.js";
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

    @property()
    private _totpToken = "";

    @property()
    private _totpLastTick = 0;

    private get _totpAge() {
        return Math.min(1, (Date.now() - this._totpLastTick) / 3e4);
    }

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
        super.updated(changes);
        // workaround for issue where string fails to be set if
        // type was previously a number type. This gives the
        // renderer time to update the input type first.
        if (changes.get("type")) {
            setTimeout(() => {
                this._valueInput.value = this.value;
            }, 10);
        }
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
                background: none;
                border: dashed 1px var(--color-shade-2);
            }

            pl-input[readonly] {
                border: none;
            }

            .totp {
                padding: 0 10px;
                display: flex;
                align-items: center;
                user-select: text;
                -webkit-user-select: text;
            }

            .countdown {
                width: 16px;
                height: 16px;
                margin-left: 8px;
                border-radius: 100%;
            }

            .countdown circle {
                transform-origin: center center;
                transform: rotate(-90deg);
                fill: none;
                stroke: currentColor;
                stroke-width: 8;
                stroke-dasharray: 25;
                transition: stroke-dashoffset 1s;
            }

            .countdown circle.bg {
                opacity: 0.2;
            }

            .drag-handle {
                cursor: grab;
            }

            .drag-handle:active {
                cursor: grabbing;
            }

            @media(hover: none) {
                .drag-handle {
                    display: none;
                }
            }
        `
    ];

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
            <div class="field-buttons left" ?hidden=${!this.editing}>
                <pl-icon
                    icon="menu"
                    class="drag-handle"
                    @mouseover=${() => this.setAttribute("draggable", "true")}
                    @mouseout=${() => this.removeAttribute("draggable")}
                >
                </pl-icon>

                <pl-icon
                    ?hidden=${this.type !== "password"}
                    icon="generate"
                    class="tap"
                    @click=${() => this.dispatch("generate")}
                >
                </pl-icon>

                <pl-icon
                    ?hidden=${this.type !== "totp"}
                    icon="qrcode"
                    class="tap"
                    @click=${() => this.dispatch("get-totp-qr")}
                >
                </pl-icon>

                <pl-icon icon="remove" class="tap" @click=${() => this.dispatch("remove")}> </pl-icon>
            </div>

            <div class="fields-container flex">
                <div class="field-header">
                    <pl-input
                        class="field-name"
                        id="nameInput"
                        placeholder="${this.editing ? $l("Enter Field Name") : $l("Unnamed")}"
                        .value=${this.name}
                        @input=${() => (this.name = this._nameInput.value)}
                        ?readonly=${!this.editing}
                    >
                    </pl-input>

                    <pl-select
                        id="typeSelect"
                        class="field-type"
                        tabindex="-1"
                        ?hidden=${!this.editing}
                        .options=${Object.values(FIELD_DEFS)}
                        .selected=${fieldDef}
                        @change=${() => (this.type = this._typeSelect.selected!.type)}
                    >
                    </pl-select>
                </div>

                ${this.type === "totp" && !this.editing
                    ? html`
                          <div class="totp">
                              ${this._totpToken.substring(0, 3)}&nbsp;${this._totpToken.substring(3, 6)}
                              ${svg`
                            <svg class="countdown" viewBox="0 0 10 10" ?hidden=${!this._totpToken}>
                                <circle cx="5" cy="5" r="4" class="bg" />
                                <circle cx="5" cy="5" r="4" style="stroke-dashoffset: ${Math.floor(
                                    this._totpAge * -25
                                )}"/>
                            </svg>
                        `}
                          </div>
                      `
                    : html`
                          <pl-input
                              id="valueInput"
                              class="field-value"
                              placeholder="${this.editing ? $l("Enter Field Value") : ""}"
                              .type=${inputType}
                              multiline
                              .readonly=${!this.editing}
                              .masked=${mask}
                              .value=${this.value}
                              @input=${() => (this.value = this._valueInput.value)}
                              autosize
                          >
                          </pl-input>
                      `}
            </div>

            <div class="field-buttons right" ?hidden=${this.editing}>
                <pl-icon
                    .icon=${(this._valueInput ? this._valueInput.masked : mask) ? "show" : "hide"}
                    class="tap"
                    ?hidden=${!fieldDef.mask}
                    @click=${() => this._toggleMask()}
                >
                </pl-icon>

                <pl-icon icon="copy" class="tap" @click=${() => this.dispatch("copy")}> </pl-icon>
            </div>
        `;
    }

    private _toggleMask() {
        this._valueInput.masked = !this._valueInput.masked;
        this.requestUpdate();
    }

    @observe("type")
    @observe("value")
    private async _updateTOTP() {
        if (this.type !== "totp" || !this.value) {
            this._totpToken = "";
            return;
        }

        if (this._totpAge >= 1) {
            this._totpLastTick = Math.floor(Date.now() / 3e4) * 3e4;
            this._totpToken = await totp(base32ToBytes(this.value));
        }

        setTimeout(() => this._updateTOTP(), 2000);

        this.requestUpdate();
    }
}
