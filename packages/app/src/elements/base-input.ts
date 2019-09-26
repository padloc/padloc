import { TemplateResult } from "lit-html";
import { BaseElement, html, css, query, property } from "./base";
import { shared } from "../styles";

let activeInput: BaseInput | null = null;

// On touch devices, blur active input when tapping on a non-input
document.addEventListener("touchend", () => {
    if (activeInput) {
        activeInput.blur();
    }
});

export abstract class BaseInput extends BaseElement {
    @property()
    autocapitalize: string = "off";

    @property({ reflect: true })
    disabled: boolean = false;

    @property({ reflect: true })
    focused: boolean = false;

    @property({ reflect: true })
    invalid: boolean = false;

    @property()
    placeholder: string = "";

    @property()
    label: string = "";

    @property({ attribute: "no-tab" })
    noTab: boolean = false;

    @property({ reflect: true })
    readonly: boolean = false;

    @property({ reflect: true })
    required: boolean = false;

    @property({ attribute: "select-on-focus" })
    selectOnFocus: boolean = false;

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

    static get activeInput() {
        return activeInput;
    }

    protected abstract _renderInput(): TemplateResult;

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

        this.dispatch("focus");

        if (this.selectOnFocus) {
            setTimeout(() => this.selectAll(), 10);
        }
    }

    protected _blurred(e: FocusEvent) {
        e.stopPropagation();
        this.focused = false;

        this.dispatch("blur");

        if (activeInput === this) {
            activeInput = null;
        }
    }

    protected _changeHandler(e: Event) {
        e.stopPropagation();
        this.dispatch("change", { prevValue: this._prevValue, value: this.value }, true, true);
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
                background: var(--shade-2-color);
                border-radius: var(--border-radius);
                padding: 12px 10px;
            }

            input {
                box-sizing: border-box;
                text-overflow: ellipsis;
                box-shadow: none;
            }

            .input-element {
                text-align: inherit;
                width: 100%;
                min-height: inherit;
                line-height: inherit;
                caret-color: currentColor;
            }

            textarea {
                overflow-wrap: break-word;
            }

            ::-webkit-search-cancel-button {
                display: none;
            }

            ::-webkit-placeholder {
                text-shadow: inherit;
                color: inherit;
                opacity: 0.5;
            }

            label {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 12px 10px;
                opacity: 0.5;
                transition: transform 0.2s, color 0.2s, opacity 0.5s;
                cursor: text;
                pointer-events: none;
            }

            label[float] {
                transform: scale(0.8) translate(0, -32px);
                color: var(--color-highlight);
                font-weight: bold;
                opacity: 1;
            }

            .input-element[disabled] {
                opacity: 1;
                -webkit-text-fill-color: currentColor;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                input[type="date"],
                input[type="month"] {
                    display: block;
                    min-height: 1.5em;
                }
            }
        `
    ];

    render() {
        const { value, focused, label, placeholder } = this;

        return html`
            ${this._renderInput()}

            <label ?float=${focused || !!value || !!placeholder} ?hidden=${!label}>${label}</label>
        `;
    }
}
