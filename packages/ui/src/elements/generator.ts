import { randomString, chars } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { shared } from "../styles";
import { BaseElement, html, property, query, listen } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";

class Generator extends BaseElement {
    @property() value: string = "";

    @query("pl-dialog") private _dialog: Dialog;
    @query("#lower") private _lower: ToggleButton;
    @query("#upper") private _upper: ToggleButton;
    @query("#numbers") private _numbers: ToggleButton;
    @query("#other") private _other: ToggleButton;
    @query("#length") private _length: Slider;

    private _resolve: ((val: string | null) => void) | null;

    render() {
        const { value } = this;
        return html`
        ${shared}

        <style>

            :host {
                --pl-dialog-inner: {
                    --color-background: var(--color-quaternary);
                    --color-foreground: var(--color-secondary);
                    --color-highlight: var(--color-primary);
                    text-shadow: none;
                    border: none;
                    overflow: hidden;
                    position: relative;
                };
            }

            .charsets {
                display: flex;
            }

            .charsets > * {
                flex: 1;
            }

            .generate-button {
                padding: 25px 15px;
                background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                color: var(--color-quaternary);
                text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
            }

            .header {
                font-weight: bold;
                text-align: center;
                margin-bottom: 15px;
            }

            .header::before, .header::after {
                font-family: "FontAwesome";
                content: "\\ \\f0e7\\ ";
            }

            .value {
                font-family: var(--font-family-mono);
                word-break: break-all;
                text-align: center;
                font-size: 130%;
            }

            pl-toggle-button {
                display: block;
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            pl-slider {
                display: flex;
                height: var(--row-height);
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            .confirm-button {
                font-weight: bold;
            }

            .close-button {
                position: absolute;
                top: 0;
                right: 0;
                color: var(--color-quaternary);
                text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
            }
        </style>

        <pl-dialog @dialog-dismiss=${() => this._dismiss()}>

            <div class="generate-button tap" @click=${() => this._generate()}>

                <div class="header">${$l("Generate Random Value")}</div>

                <div class="value tiles-1">
                    ${value}
                </div>

            </div>

            <pl-toggle-button
                id="lower"
                label="a-z"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="upper"
                label="A-Z"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="numbers"
                label="0-9"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="other"
                label="?()/%..."
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-slider
                id="length"
                label="${$l("length")}"
                min="5"
                max="50">
            </pl-slider>

            <button class="confirm-button tap" @click=${() => this._confirm()}>${$l("Apply")}</button>

            <pl-icon icon="cancel" class="close-button tap" @click=${() => this._dismiss()}></pl-icon>

        </pl-dialog>
`;
    }

    connectedCallback() {
        super.connectedCallback();
        this._lower.active = this._upper.active = this._numbers.active = true;
        this._length.value = 10;
    }

    generate(): Promise<string | null> {
        this._generate();
        this._dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    @listen("change")
    _generate() {
        var charSet = "";
        this._lower.active && (charSet += chars.lower);
        this._upper.active && (charSet += chars.upper);
        this._numbers.active && (charSet += chars.numbers);
        this._other.active && (charSet += chars.other);

        this.value = charSet ? randomString(this._length.value, charSet) : "";
    }

    private _confirm() {
        typeof this._resolve === "function" && this._resolve(this.value);
        this._dialog.open = false;
    }

    private _dismiss() {
        typeof this._resolve === "function" && this._resolve(null);
        this._dialog.open = false;
    }
}

window.customElements.define("pl-generator", Generator);
