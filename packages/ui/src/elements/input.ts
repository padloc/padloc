// @ts-ignore
import autosize from "autosize/src/autosize.js";
import sharedStyles from "../styles/shared";
import { BaseElement, html, property, query, listen } from "./base.js";

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

export class Input extends BaseElement {
    @property() autosize: boolean = false;
    @property() autocapitalize: boolean = false;
    @property() disabled: boolean = false;
    @property() focused: boolean = false;
    @property() invalid: boolean = false;
    @property() masked: boolean = false;
    @property() multiline: boolean = false;
    @property() pattern: string = "";
    @property() placeholder: string = "";
    @property() noTab: boolean = false;
    @property() readonly: boolean = false;
    @property() required: boolean = false;
    @property() type: string = "text";
    @property() selectOnFocus: boolean = false;
    @property() value: string = "";

    @query("textarea, input") private _inputElement: HTMLInputElement;

    static get activeInput() {
        return activeInput;
    }

    _render(props: any) {
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

    get validationMessage() {
        return this._inputElement.validationMessage;
    }

    @listen("focus")
    _focused(e: Event) {
        e.stopPropagation();
        this.focused = true;
        activeInput = this;
        this.dispatchEvent(new CustomEvent("focus"));

        if (this.selectOnFocus) {
            setTimeout(() => this.selectAll(), 10);
        }
    }

    @listen("blur")
    _blurred(e: Event) {
        e.stopPropagation();
        this.focused = false;
        if (activeInput === this) {
            activeInput = null;
        }
        this.dispatchEvent(new CustomEvent("blur"));
    }

    @listen("input")
    _changeHandler(e: Event) {
        e.stopPropagation();
        this.value = this._inputElement.value;
        this.invalid = this._inputElement && !this._inputElement.checkValidity();
        this.dispatchEvent(new CustomEvent("change"));
    }

    @listen("keydown")
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

    @listen("touchend")
    _touchend(e: Event) {
        e.preventDefault();
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

window.customElements.define("pl-input", Input);
