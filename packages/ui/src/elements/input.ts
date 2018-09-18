// @ts-ignore
import autosize from "autosize/src/autosize.js";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, property, query, listen } from "./base.js";

let activeInput: Input | null = null;

// On touch devices, blur active input when tapping on a non-input
document.addEventListener("touchend", () => {
    if (activeInput) {
        activeInput.blur();
    }
});

function mask(value: string): string {
    return value && value.replace(/[^\n]/g, "\u2022");
}

@element("pl-input")
export class Input extends BaseElement {
    @property() autosize: boolean = false;
    @property() autocapitalize: boolean = false;
    @property({ reflect: true })
    disabled: boolean = false;
    @property({ reflect: true })
    focused: boolean = false;
    @property({ reflect: true })
    invalid: boolean = false;
    @property() masked: boolean = false;
    @property() multiline: boolean = false;
    @property() pattern: string = "";
    @property() placeholder: string = "";
    @property() label: string = "";
    @property({ attribute: "no-tab" })
    noTab: boolean = false;
    @property({ reflect: true })
    readonly: boolean = false;
    @property({ reflect: true })
    required: boolean = false;
    @property() type: string = "text";
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
            this._inputElement.value = val;
            if (this.multiline && this.autosize) {
                autosize.update(this._inputElement);
            }
        })();
    }

    @query("textarea, input") private _inputElement: HTMLInputElement;

    private _prevValue: string = this.value;

    static get activeInput() {
        return activeInput;
    }

    firstUpdated() {
        if (this.multiline && this.autosize) {
            autosize(this._inputElement);
        }
    }

    render() {
        const {
            value,
            masked,
            focused,
            label,
            multiline,
            placeholder,
            readonly,
            noTab,
            disabled,
            autocapitalize,
            required,
            type,
            pattern
        } = this;
        const doMask = masked && !!value && !focused;

        const input = multiline
            ? html`
                <textarea
                    id="input"
                    .value=${value}
                    .placeholder=${placeholder}
                    .tabIndex=${noTab ? "-1" : ""}
                    ?readonly=${readonly}
                    ?invisible=${doMask}
                    ?disabled=${disabled}
                    ?required=${required}
                    autocapitalize="${autocapitalize ? "" : "off"}"
                    autocomplete="off"
                    spellcheck="false"
                    autocorrect="off"
                    rows="1"></textarea>

                <textarea
                    .value=${mask(value)}
                    ?invisible=${!doMask}
                    class="mask"
                    .tabIndex="-1"
                    disabled></textarea>`
            : html`
                <input
                    id="input"
                    .value=${value}
                    .placeholder=${placeholder}
                    ?readonly=${readonly}
                    .tabIndex=${noTab ? "-1" : ""}
                    ?invisible=${doMask}
                    ?disabled=${disabled}
                    autocapitalize="${autocapitalize ? "" : "off"}"
                    ?required=${required}
                    autocomplete="off"
                    spellcheck="false"
                    autocorrect="off"
                    type="${type}"
                    pattern="${pattern || ".*"}">

                <input
                    .value=${mask(value)}
                    ?invisible=${!doMask}
                    class="mask"
                    .tabIndex="-1"
                    disabled>`;

        return html`
        ${shared}

        <style>

            :host {
                display: block;
                position: relative;
            }

            :host(:not([multiline])) {
                padding: 0 10px;
                height: var(--row-height);
            }

            :host([invalid]) {
                color: var(--color-error);
            }

            input {
                box-sizing: border-box;
                text-overflow: ellipsis;
            }

            input, textarea {
                text-align: inherit;
                width: 100%;
                height: 100%;
                min-height: inherit;
                line-height: inherit;
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

            --fullbleed: {
                position: absolute;
            }

            .mask {
                ${mixins.fullbleed()}
                pointer-events: none;
                font-size: 150%;
                line-height: 22px;
                letter-spacing: -4.5px;
                margin-left: -4px;
            }

            label {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 13px;
                opacity: 0.5;
                transition: transform 0.2s, color 0.2s, opacity 0.5s;
                cursor: text;
            }

            label[float] {
                transform: scale(0.8) translate(0, -32px);
                color: var(--color-highlight);
                font-weight: bold;
                opacity: 1;
            }

            input[disabled], textarea[disabled] {
                opacity: 1;
                -webkit-text-fill-color: currentColor;
            }

            input[invisible], textarea[invisible] {
                opacity: 0;
            }
        </style>

        ${input}

        <label for="input" ?float=${focused || !!value || !!placeholder}>${label}</label>
        `;
    }

    _didRender() {
        if (this.multiline && this.autosize) {
            autosize.update(this._inputElement);
        }
    }

    get validationMessage() {
        return this._inputElement.validationMessage;
    }

    @listen("focus")
    _focused() {
        this.focused = true;
        activeInput = this;

        if (this.selectOnFocus) {
            setTimeout(() => this.selectAll(), 10);
        }
    }

    @listen("blur")
    _blurred() {
        this._updateValidity();
        this.focused = false;
        if (activeInput === this) {
            activeInput = null;
        }
    }

    @listen("change", "input, textarea")
    _changeHandler(e: Event) {
        e.stopPropagation();
        this.dispatch("change", { prevValue: this._prevValue, valud: this.value }, true, true);
        this._prevValue = this.value;
    }

    @listen("keydown")
    _keydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !this.multiline) {
            this._updateValidity();
            this.dispatch("enter");
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key === "Escape") {
            this.dispatch("escape");
            e.preventDefault();
            e.stopPropagation();
        }
    }

    @listen("touchend")
    _touchend(e: Event) {
        e.stopPropagation();
    }

    private _updateValidity() {
        this.invalid = this._inputElement && this._inputElement.checkValidity && !this._inputElement.checkValidity();
    }

    focus() {
        this._inputElement.focus();
    }

    blur() {
        this._inputElement.blur();
    }

    selectAll() {
        try {
            this._inputElement.setSelectionRange(0, this.value.length);
        } catch (e) {
            this._inputElement.select();
        }
    }
}
