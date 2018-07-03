import { LitElement, html } from "@polymer/lit-element";
// @ts-ignore
import autosize from "autosize/src/autosize.js";
import sharedStyles from "../styles/shared";

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

export class Input extends LitElement {
    static get activeInput() {
        return activeInput;
    }

    static get properties() {
        return {
            autosize: Boolean,
            autocapitalize: Boolean,
            disabled: Boolean,
            focused: Boolean,
            invalid: Boolean,
            masked: Boolean,
            multiline: Boolean,
            pattern: String,
            placeholder: String,
            noTab: Boolean,
            readonly: Boolean,
            required: Boolean,
            type: String,
            selectOnFocus: Boolean,
            value: String
        };
    }

    constructor() {
        super();
        this.autosize = false;
        this.autocapitalize = false;
        this.disabled = false;
        this.focused = false;
        this.invalid = false;
        this.masked = false;
        this.multiline = false;
        this.pattern = "";
        this.placeholder = "";
        this.noTab = false;
        this.readonly = false;
        this.required = false;
        this.type = "text";
        this.selectOnFocus = false;
        this.value = "";
    }

    _render(props: any) {
        const masked = props.masked && !!props.value && !props.focused;
        const el = props.multiline ? "input" : "textarea";
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
                    on-input="${() => (this.value = this.inputElement.value)}"
                    on-focus="${(e: Event) => this._focused(e)}"
                    on-blur="${(e: Event) => this._blurred(e)}"
                    on-change="${(e: Event) => this._changeHandler(e)}"
                    on-keydown="${(e: KeyboardEvent) => this._keydown(e)}"
                    on-touchend="${(e: Event) => e.stopPropagation()}"
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
                    on-input="${() => (this.value = this.inputElement.value)}"
                    on-focus="${(e: Event) => this._focused(e)}"
                    on-blur="${(e: Event) => this._blurred(e)}"
                    on-change="${(e: Event) => this._changeHandler(e)}"
                    on-keydown="${(e: KeyboardEvent) => this._keydown(e)}"
                    on-touchend="${(e: Event) => e.stopPropagation()}"
                    type$="${props.type}"
                    pattern$="${props.pattern}">

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

    get inputElement() {
        return this.shadowRoot.querySelector(this.multiline ? "textarea" : "input");
    }

    _domChange() {
        if (this.autosize && this.multiline && this.inputElement) {
            autosize(this.inputElement);
        }
        setTimeout(() => this._valueChanged(), 50);
    }

    _focused(e: Event) {
        e.stopPropagation();
        this.focused = true;
        activeInput = this;
        this.dispatchEvent(new CustomEvent("focus"));

        if (this.selectOnFocus) {
            setTimeout(() => this.selectAll(), 10);
        }
    }

    _blurred(e: Event) {
        e.stopPropagation();
        this.focused = false;
        if (activeInput === this) {
            activeInput = null;
        }
        this.dispatchEvent(new CustomEvent("blur"));
    }

    _changeHandler(e: Event) {
        e.stopPropagation();
        this.value = this.inputElement.value;
        this.dispatchEvent(new CustomEvent("change"));
    }

    _keydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !this.multiline) {
            this.dispatchEvent(new CustomEvent("enter"));
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key === "Escape") {
            this.dispatchEvent(new CustomEvent("escape"));
            e.preventDefault();
            e.stopPropagation();
        }
    }

    _valueChanged() {
        this.invalid = this.inputElement && !this.inputElement.checkValidity();
        if (this.autosize && this.multiline) {
            autosize.update(this.inputElement);
        }
    }

    focus() {
        this.inputElement.focus();
    }

    blur() {
        this.inputElement.blur();
    }

    selectAll() {
        try {
            this.inputElement.setSelectionRange(0, this.value.length);
        } catch (e) {
            this.inputElement.select();
        }
    }
}

window.customElements.define("pl-input", Input);
