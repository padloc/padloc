import { randomString, chars } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import { BaseElement, html, property, query, listen } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";

class Generator extends BaseElement {
    @property() value: string = "";
    @property() length: number = 10;
    @property() lower: boolean = true;
    @property() upper: boolean = true;
    @property() numbers: boolean = true;
    @property() other: boolean = false;

    @query("pl-dialog") private _dialog: Dialog;

    private _resolve: ((val: string | null) => void) | null;

    _render({ value, length, lower, upper, numbers, other }: this) {
        return html`
        <style>

            ${sharedStyles}

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

        <pl-dialog on-dialog-dismiss="${() => this._dismiss()}">

            <div class="generate-button tap" on-click="${() => this._generate()}">

                <div class="header">${$l("Generate Random Value")}</div>

                <div class="value tiles-1">
                    ${value}
                </div>

            </div>

            <pl-toggle-button
                label="a-z"
                active="${lower}"
                class="tap"
                reverse
                on-change="${(e: Event) => (this.lower = (e.target as ToggleButton).active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="A-Z"
                active="${upper}"
                class="tap"
                reverse
                on-change="${(e: Event) => (this.upper = (e.target as ToggleButton).active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="0-9"
                active="${numbers}"
                class="tap"
                reverse
                on-change="${(e: Event) => (this.numbers = (e.target as ToggleButton).active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="?()/%..."
                active="${other}"
                class="tap"
                reverse
                on-change="${(e: Event) => (this.other = (e.target as ToggleButton).active)}">
            </pl-toggle-button>

            <pl-slider
                label="${$l("length")}"
                min="5"
                max="50"
                value="${length}"
                on-change="${(e: any) => (this.length = (e.target as Slider).value)}">
            ></pl-slider>

            <button class="confirm-button tap" on-click="${() => this._confirm()}">${$l("Apply")}</button>

            <pl-icon icon="cancel" class="close-button tap" on-click="${() => this._dismiss()}"></pl-icon>

        </pl-dialog>
`;
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
        this.lower && (charSet += chars.lower);
        this.upper && (charSet += chars.upper);
        this.numbers && (charSet += chars.numbers);
        this.other && (charSet += chars.other);

        this.value = charSet ? randomString(this.length, charSet) : "";
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
