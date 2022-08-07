import { css, html, LitElement, TemplateResult } from "lit";
import { property, query } from "lit/decorators.js";
import { shared } from "../styles";

let activeInput: BaseInput | null = null;

// On touch devices, blur active input when tapping on a non-input
document.addEventListener("touchend", () => {
    if (activeInput) {
        activeInput.blur();
    }
});

export abstract class BaseInput extends LitElement {
    @property()
    autocapitalize: string = "off";

    @property({ type: Boolean, reflect: true })
    disabled: boolean = false;

    @property({ type: Boolean, reflect: true })
    focused: boolean = false;

    @property({ type: Boolean, reflect: true })
    invalid: boolean = false;

    @property()
    placeholder: string = "";

    @property({ reflect: true })
    label: string = "";

    @property({ type: Boolean, attribute: "no-tab" })
    noTab: boolean = false;

    @property({ type: Boolean, reflect: true })
    readonly: boolean = false;

    @property({ type: Boolean, reflect: true })
    required: boolean = false;

    @property({ type: Boolean, attribute: "select-on-focus" })
    selectOnFocus: boolean = false;

    @property({ type: Number })
    maxlength: number;

    @property()
    get value(): string {
        return (this._inputElement && this._inputElement.value) || "";
    }
    set value(val: string) {
        (async () => {
            if (!this._inputElement) {
                await this.updateComplete;
            }
            const oldValue = this._inputElement.value;
            this._inputElement.value = val;
            this.requestUpdate("value", oldValue);
        })();
    }

    @query(".input-element")
    protected _inputElement: HTMLInputElement;

    private _prevValue: string = this.value;

    protected _inputId: string = BaseInput._createInputId();

    private static _inputCount = 0;

    private static _createInputId() {
        BaseInput._inputCount++;
        return `pl_input_${BaseInput._inputCount}`;
    }

    static get activeInput() {
        return activeInput;
    }

    protected abstract _renderInput(): TemplateResult;

    protected _renderBefore() {
        return html` <slot name="before"></slot> `;
    }

    protected _renderAfter() {
        return html` <slot name="after"></slot> `;
    }

    protected _renderAbove() {
        return html` <slot name="above"></slot> `;
    }

    protected _renderBelow() {
        return html` <slot name="below"></slot> `;
    }

    async focus() {
        if (!this._inputElement) {
            await this.updateComplete;
        }
        this._inputElement.focus();
    }

    async blur() {
        if (!this._inputElement) {
            await this.updateComplete;
        }
        this._inputElement.blur();
    }

    selectAll() {
        try {
            this._inputElement.setSelectionRange(0, this.value.length);
        } catch (e) {
            this._inputElement.select();
        }
    }

    protected _focused(e: FocusEvent) {
        e.stopPropagation();
        this.focused = true;
        activeInput = this;

        this.dispatchEvent(new CustomEvent("focus"));

        if (this.selectOnFocus) {
            setTimeout(() => this.selectAll(), 10);
        }
    }

    protected _blurred(e: FocusEvent) {
        e.stopPropagation();
        this.focused = false;

        this.dispatchEvent(new CustomEvent("blur"));

        if (activeInput === this) {
            activeInput = null;
        }
    }

    protected _changeHandler(e: Event) {
        e.stopPropagation();
        this.dispatchEvent(
            new CustomEvent("change", {
                detail: { prevValue: this._prevValue, value: this.value },
                composed: true,
                bubbles: true,
            })
        );
        this._prevValue = this.value;
    }

    protected _touchend(e: Event) {
        e.stopPropagation();
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                font-size: inherit;
                font-weight: inherit;
                font-family: inherit;
                border-width: var(--input-border-width, var(--border-width));
                border-style: var(--input-border-style, var(--border-style));
                border-color: var(--input-border-color, var(--border-color));
                border-radius: var(--input-border-radius, 0.5em);
                background: var(--input-background, transparent);
                color: inherit;
                text-shadow: inherit;
                line-height: 1.5em;
                --padding: var(--input-padding, 0.8em);
            }

            :host([focused]:not([readonly])) {
                border-color: var(--input-focused-border-color, var(--color-highlight));
            }

            :host(.transparent) {
                border-color: transparent;
            }

            :host(.skinny) {
                --padding: 0.3em;
            }

            :host(.slim) {
                --padding: 0.5em;
            }

            :host(.dashed) {
                border-style: dashed;
                border-width: 1px;
            }

            .input-container {
                display: flex;
                align-self: stretch;
            }

            .input-element {
                padding: var(--padding);
                width: 100%;
                box-sizing: border-box;
                caret-color: currentColor;
                cursor: inherit;
                text-shadow: inherit;
                line-height: inherit;
                text-align: inherit;
                font-size: inherit;
                font-family: inherit;
                text-transform: inherit;
            }

            .input-element:focus-visible {
                box-shadow: unset;
            }

            :host(:not([label=""])) .input-element {
                padding-top: calc(var(--padding) + 0.5em);
                padding-bottom: calc(var(--padding) - 0.5em);
            }

            ::placeholder {
                text-shadow: inherit;
                color: inherit;
                opacity: 0.5;
            }

            label {
                top: var(--padding);
                left: var(--padding);
                opacity: 0.5;
                transition: transform 0.2s, color 0.2s, opacity 0.5s;
                cursor: text;
                pointer-events: none;
                position: absolute;
                transform-origin: center left;
            }

            label.float {
                transform: scale(0.7) translate(0px, -0.9em);
                color: var(--input-label-color, var(--color-highlight));
                opacity: 1;
                text-transform: uppercase;
            }

            .input-element[disabled] {
                opacity: 1;
                -webkit-text-fill-color: currentColor;
            }
        `,
    ];

    render() {
        const { focused, value, placeholder } = this;
        return html`
            <div class="vertical layout">
                <div>${this._renderAbove()}</div>
                <div class="horizontal center-aligning layout stretch">
                    ${this._renderBefore()}

                    <div class="input-container stretch">
                        ${this.label
                            ? html`
                                  <label
                                      class="${focused || !!value || !!placeholder ? "float" : ""}"
                                      for=${this._inputId}
                                      >${this.label}</label
                                  >
                              `
                            : ""}
                        ${this._renderInput()}
                    </div>

                    ${this._renderAfter()}
                </div>
                <div>${this._renderBelow()}</div>
            </div>
        `;
    }
}
