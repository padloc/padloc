import "../styles/shared.js";
import { BaseElement, html } from "../elements/base.js";

class Notification extends BaseElement {
    static get template() {
        return html`
        <style include="shared">
            :host {
                display: block;
                text-align: center;
                font-weight: bold;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 15px;
                right: 15px;
                bottom: 15px;
                z-index: 10;
                max-width: 400px;
                margin: 0 auto;
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
            }

            :host(:not(.showing)) {
                transform: translateY(130%);
            }

            .text {
                padding: 15px;
                position: relative;
            }

            .background {
                opacity: 0.95;
                border-radius: var(--border-radius);
                @apply --fullbleed;
                background: linear-gradient(90deg, rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
            }

            :host(.error) .background, :host(.warning) .background {
                background: linear-gradient(90deg, #f49300 0%, #f25b00 100%);
            }
        </style>

        <div class="background"></div>

        <div class="text" on-click="_click">{{ message }}</div>
`;
    }

    static get is() {
        return "pl-notification";
    }

    static get properties() {
        return {
            message: String,
            type: {
                type: String,
                value: "info",
                observer: "_typeChanged"
            }
        };
    }

    show(message, type, duration) {
        if (message) {
            this.message = message;
        }

        if (type) {
            this.type = type;
        }

        this.classList.add("showing");

        if (duration) {
            setTimeout(() => this.hide(false), duration);
        }

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    hide(clicked) {
        this.classList.remove("showing");
        typeof this._resolve === "function" && this._resolve(clicked);
        this._resolve = null;
    }

    _typeChanged(newType, oldType) {
        this.classList.remove(oldType);
        this.classList.add(newType);
    }

    _click() {
        this.hide(true);
    }
}

window.customElements.define(Notification.is, Notification);
