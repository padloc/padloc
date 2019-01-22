import { element, html } from "./base.js";
import { Input } from "./input.js";
import "./icon.js";

@element("pl-password-input")
export class PasswordInput extends Input {
    constructor() {
        super();
        this.type = "password";
    }

    render() {
        return html`
            ${super.render()}

            <style>
                /*
                :host {
                    padding: 5px 10px !important;
                }

                label {
                    padding: 18px;
                }

                label[float] {
                    transform: scale(0.8) translate(0, -38px);
                }
                */

                input {
                    font-size: 120%;
                    font-family: var(--font-family-mono);
                }

                .mask-icon {
                    position: absolute;
                    z-index: 1;
                    right: 5px;
                    top: 0;
                    bottom: 0;
                    margin: auto;
                    opacity: 0.8;
                }
            </style>

            <pl-icon
                icon="${this.type === "password" ? "show" : "hide"}"
                class="mask-icon tap"
                @click=${this._toggleMasked}>
            </pl-icon>
        
        `;
    }

    _toggleMasked() {
        this.type = this.type === "password" ? "text" : "password";
    }
}
