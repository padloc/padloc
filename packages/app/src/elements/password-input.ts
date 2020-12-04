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
                font-family: var(--font-family-mono);
            }

            ::placeholder {
                font-family: var(--font-family);
            }

            pl-icon {
                margin: -1em -0.5em -1em 0;
            }
        `,
    ];

    render() {
        return html`
            <div class="center-aligning horizontal layout">
                <div class="relative stretch">${super.render()}</div>

                <pl-icon icon="${this.type === "password" ? "show" : "hide"}" class="tap" @click=${this._toggleMasked}>
                </pl-icon>
            </div>
        `;
    }

    _toggleMasked() {
        this.type = this.type === "password" ? "text" : "password";
    }
}
