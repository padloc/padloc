import { LitElement, html } from "@polymer/lit-element";
import { randomString, chars } from "@padlock/core/lib/util.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";
import "./dialog.js";
import "./icon.js";
import "./slider.js";
import "./toggle-button.js";

class Generator extends LitElement {
    static get properties() {
        return {
            value: String,
            length: Number,
            lower: Boolean,
            upper: Boolean,
            numbers: Boolean,
            other: Boolean
        };
    }

    constructor() {
        super();
        this.value = "";
        this.length = 10;
        this.lower = true;
        this.upper = true;
        this.numbers = true;
        this.other = false;
    }

    _render(props: {
        value: string;
        length: number;
        lower: boolean;
        upper: boolean;
        numbers: boolean;
        other: boolean;
    }) {
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

        <pl-dialog id="dialog" on-dialog-dismiss="${() => this._dismiss()}">

            <div class="generate-button tap" on-click="${() => this._generate()}">

                <div class="header">${$l("Generate Random Value")}</div>

                <div class="value tiles-1">
                    ${props.value}
                </div>

            </div>

            <pl-toggle-button
                label="a-z"
                active="${props.lower}"
                class="tap"
                reverse
                on-change="${(e: any) => (this.lower = e.target.active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="A-Z"
                active="${props.upper}"
                class="tap"
                reverse
                on-change="${(e: any) => (this.upper = e.target.active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="0-9"
                active="${props.numbers}"
                class="tap"
                reverse
                on-change="${(e: any) => (this.numbers = e.target.active)}">
            </pl-toggle-button>

            <pl-toggle-button
                label="?()/%..."
                active="${props.other}"
                class="tap"
                reverse
                on-change="${(e: any) => (this.other = e.target.active)}">
            </pl-toggle-button>

            <pl-slider
                label="${$l("length")}"
                min="5"
                max="50"
                value="${props.length}"
                on-change="${(e: any) => (this.length = e.target.value)}">
            ></pl-slider>

            <button class="confirm-button tap" on-click="${() => this._confirm()}">${$l("Apply")}</button>

            <pl-icon icon="cancel" class="close-button tap" on-click="${() => this._dismiss()}"></pl-icon>

        </pl-dialog>
`;
    }

    get dialog() {
        return this.shadowRoot.querySelector("pl-dialog");
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this._generate());
    }

    generate() {
        this._generate();
        this.dialog.open = true;
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    _generate() {
        var charSet = "";
        this.lower && (charSet += chars.lower);
        this.upper && (charSet += chars.upper);
        this.numbers && (charSet += chars.numbers);
        this.other && (charSet += chars.other);

        this.value = charSet ? randomString(this.length, charSet) : "";
    }

    _confirm() {
        typeof this._resolve === "function" && this._resolve(this.value);
        this.dialog.open = false;
    }

    _dismiss() {
        typeof this._resolve === "function" && this._resolve(undefined);
        this.dialog.open = false;
    }
}

window.customElements.define("pl-generator", Generator);
