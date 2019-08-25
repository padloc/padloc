import { element, html, css } from "./base";
import { Input } from "./input";
import "./icon";

@element("pl-password-input")
export class PasswordInput extends Input {
    constructor() {
        super();
        this.type = "password";
    }

    static styles = [
        ...Input.styles,
        css`
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
        `
    ];

    render() {
        return html`
            ${super.render()}

            <pl-icon
                icon="${this.type === "password" ? "show" : "hide"}"
                class="mask-icon tap"
                @click=${this._toggleMasked}
            >
            </pl-icon>
        `;
    }

    _toggleMasked() {
        this.type = this.type === "password" ? "text" : "password";
    }
}
