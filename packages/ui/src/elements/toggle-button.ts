import { LitElement, html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared.js";
import "./toggle.js";

class ToggleButton extends LitElement {
    static get properties() {
        return {
            active: Boolean,
            label: String,
            reverse: Boolean
        };
    }

    get toggleEl() {
        return this.shadowRoot.querySelector("pl-toggle");
    }

    _didRender() {
        if (this.active) {
            this.setAttribute("active", "");
        } else {
            this.removeAttribute("active");
        }
        if (this.reverse) {
            this.setAttribute("reverse", "");
        } else {
            this.removeAttribute("reverse");
        }
    }

    _render(props: { active: boolean; label: string; reverse: boolean }) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                display: inline-block;
                font-size: inherit;
                height: var(--row-height);
                padding: 0 15px;
            }

            button {
                display: flex;
                width: 100%;
                align-items: center;
                height: 100%;
                padding: 0;
                line-height: normal;
                text-align: left;
            }

            button > div {
                flex: 1;
            }

            :host(:not([reverse])) button > div {
                padding-left: 0.5em;
            }

            :host([reverse]) button {
                flex-direction: row-reverse;
            }

            pl-toggle {
                display: inline-block;
                pointer-events: none;
            }
        </style>

        <button on-click="${() => this.toggle()}">
            <pl-toggle active="${props.active}" on-change=${() => (this.active = this.toggleEl.active)}"></pl-toggle>
            <div>${props.label}</div>
        </button>
`;
    }

    toggle() {
        this.toggleEl.toggle();
    }
}

window.customElements.define("pl-toggle-button", ToggleButton);
