import "../styles/shared.js";
import { randomString, chars } from "../core/util.js";
import { BaseElement, html } from "./base.js";
import "./dialog.js";
import "./icon.js";
import "./slider.js";
import "./toggle-button.js";
import { LocaleMixin } from "../mixins";

class Generator extends LocaleMixin(BaseElement) {
    static get template() {
        return html`
        <style include="shared">
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

        <pl-dialog id="dialog" on-dialog-dismiss="_dismiss">
            <div class="generate-button tap" on-click="_generate">
                <div class="header">[[ \$l("Generate Random Value") ]]</div>
                <div class="value tiles-1">
                    {{ value }}
                </div>
            </div>
            <pl-toggle-button label="a-z" active="{{ lower }}" class="tap" reverse=""></pl-toggle-button>
            <pl-toggle-button label="A-Z" active="{{ upper }}" class="tap" reverse=""></pl-toggle-button>
            <pl-toggle-button label="0-9" active="{{ numbers }}" class="tap" reverse=""></pl-toggle-button>
            <pl-toggle-button label="?()/%..." active="{{ other }}" class="tap" reverse=""></pl-toggle-button>
            <pl-slider label="[[ \$l('length') ]]" min="5" max="50" value="{{ length }}"></pl-slider>
            <button class="confirm-button tap" on-click="_confirm">[[ \$l("Apply") ]]</button>
            <pl-icon icon="cancel" class="close-button tap" on-click="_dismiss"></pl-icon>
        </pl-dialog>
`;
    }

    static get is() {
        return "pl-generator";
    }

    static get properties() {
        return {
            value: {
                type: String,
                value: "",
                notify: true
            },
            length: {
                type: Number,
                value: 10
            },
            lower: {
                type: Boolean,
                value: true
            },
            upper: {
                type: Boolean,
                value: true
            },
            numbers: {
                type: Boolean,
                value: true
            },
            other: {
                type: Boolean,
                value: false
            }
        };
    }

    static get observers() {
        return ["_generate(length, lower, upper, numbers, other)"];
    }

    generate() {
        this._generate();
        this.$.dialog.open = true;
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
        this.$.dialog.open = false;
    }

    _dismiss() {
        typeof this._resolve === "function" && this._resolve(undefined);
        this.$.dialog.open = false;
    }
}

window.customElements.define(Generator.is, Generator);
