// @ts-ignore
import autosize from "autosize/src/autosize.js";
import sharedStyles from "../styles/shared";
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
    @property() noTab: boolean = false;
    @property({ reflect: true })
    readonly: boolean = false;
    @property({ reflect: true })
    required: boolean = false;
    @property() type: string = "text";
    @property() selectOnFocus: boolean = false;
    @property() value: string = "";

    @query("textarea, input") private _inputElement: HTMLInputElement;

    private _prevValue: string = this.value;

    static get activeInput() {
        return activeInput;
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.multiline && this.autosize) {
            autosize(this._inputElement);
        }
    }

    _render(props: this) {
        const masked = props.masked && !!props.value && !props.focused;
        const input = props.multiline
            ? html`
                <textarea
                    id="input"
                    value="${props.value}"
                    placeholder$="${props.placeholder}"
                    readonly?="${props.readonly}"
                    tabindex$="${props.noTab ? "-1" : ""}"
                    invisible?="${masked}"
                    disabled?="${props.disabled}"
                    autocapitalize$="${props.autocapitalize ? "" : "off"}"
                    required?="${props.required}"
                    autocomplete="off"
                    spellcheck="false"
                    autocorrect="off"
                    rows="1"></textarea>

                <textarea
                    value="${mask(props.value)}"
                    invisible?="${!masked}"
                    class="mask"
                    tabindex="-1"
                    disabled></textarea>`
            : html`
                <input
                    id="input"
                    value="${props.value}"
                    placeholder$="${props.placeholder}"
                    readonly?="${props.readonly}"
                    tabindex$="${props.noTab ? "-1" : ""}"
                    invisible?="${masked}"
                    disabled?="${props.disabled}"
                    autocapitalize$="${props.autocapitalize ? "" : "off"}"
                    required?="${props.required}"
                    autocomplete="off"
                    spellcheck="false"
                    autocorrect="off"
                    type$="${props.type}"
                    pattern$="${props.pattern || ".*"}">

                <input
                    value="${mask(props.value)}"
                    invisible?="${!masked}"
                    class="mask"
                    tabindex="-1"
                    disabled>`;

        return html`<style>
            ${sharedStyles}

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

            ::-webkit-input-placeholder {
                text-shadow: inherit;
                color: inherit;
                opacity: 0.5;
                @apply --pl-input-placeholder;
            }

            --fullbleed: {
                position: absolute;
            }

            .mask {
                @apply --fullbleed;
                pointer-events: none;
                font-size: 150%;
                line-height: 22px;
                letter-spacing: -4.5px;
                margin-left: -4px;
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

    @listen("input", "input, textarea")
    _inputHandler(e: Event) {
        if (e.target === this) {
            return;
        }
        e.stopPropagation();
        const oldVal = this.value;
        this.value = this._inputElement.value;
        this.dispatch("input", { prevValue: oldVal, value: this.value }, true, true);
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
