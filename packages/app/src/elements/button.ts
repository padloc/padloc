import { shared, mixins } from "../styles";
import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import "./icon";
import "./spinner";
import { Toggle } from "./toggle";

type ButtonState = "idle" | "loading" | "success" | "fail";
type ButtonRole = "button" | "switch" | "link";

@customElement("pl-button")
export class Button extends LitElement {
    @property()
    role: ButtonRole = "button";

    @property({ reflect: true })
    state: ButtonState = "idle";

    @property({ type: Boolean })
    noTab: boolean = false;

    @property()
    label: string = "";

    @property({ type: Boolean, reflect: true })
    toggled?: boolean;

    @query("button")
    private _button: HTMLButtonElement;

    private _stopTimeout: number;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                text-align: center;
                font-weight: var(--button-font-weight);
            }

            :host([state="loading"]) button {
                cursor: progress;
            }

            button {
                background: transparent;
                position: relative;
                width: 100%;
                box-sizing: border-box;
                padding: var(--button-padding, 0.7em);
                background: var(--button-background);
                color: var(--button-color, currentColor);
                border-width: var(--button-border-width);
                border-style: var(--button-border-style);
                border-color: var(--button-border-color);
                border-radius: var(--button-border-radius, 0.5em);
                font-weight: inherit;
                text-align: inherit;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
                --focus-outline-color: var(--button-focus-outline-color);
                box-shadow: var(--button-shadow);
            }

            :host([toggled]:not(.disable-toggle-styling)) button {
                background: var(--button-toggled-background, var(--color-highlight));
                color: var(--button-toggled-color, var(--color-white));
                border-width: var(--button-toggled-border-width, var(--button-border-width));
                border-style: var(--button-toggled-border-style, var(--button-border-style));
                border-color: var(--button-toggled-border-color, var(--button-border-color));
                font-weight: var(--button-toggled-font-weight);
                transform: scale(1.02);
            }

            :host(.transparent) button {
                background: transparent;
                border-color: transparent;
                color: var(--button-transparent-color);
            }

            :host(.round) button {
                border-radius: 100%;
            }

            :host(.primary) button {
                background: var(--button-primary-background, var(--button-background));
                color: var(--button-primary-color, var(--button-color));
                text-shadow: var(--text-shadow);
                border-width: var(--button-primary-border-width, var(--button-border-width));
                border-style: var(--button-primary-border-style, var(--button-border-style));
                border-color: var(--button-primary-border-color, var(--button-border-color));
                font-weight: var(--button-primary-font-weight, var(--button-font-weight));
                --focus-outline-color: var(--button-primary-focus-outline-color);
            }

            :host(.primary[toggled]:not(.disable-toggle-styling)) button {
                background: var(--button-primary-toggled-background, var(--button-toggled-background));
                color: var(--button-primary-toggled-color, var(--button-toggled-color));
                border-width: var(--button-primary-toggled-border-width, var(--button-toggled-border-width));
                border-style: var(--button-primary-toggled-border-style, var(--button-toggled-border-style));
                border-color: var(--button-primary-toggled-border-color, var(--button-toggled-border-color));
                font-weight: var(--button-primary-toggled-font-weight, var(--button-primary-font-weight));
                transform: scale(1.02);
            }

            :host(.ghost) button {
                background: var(--button-ghost-background, var(--button-background));
                color: var(--button-ghost-color, var(--button-color));
                border-width: var(--button-ghost-border-width, var(--button-border-width));
                border-style: var(--button-ghost-border-style, var(--button-border-style));
                border-color: var(--button-ghost-border-color, var(--button-border-color));
                font-weight: var(--button-ghost-font-weight, var(--button-font-weight));
                --focus-outline-color: var(--button-ghost-focus-outline-color);
            }

            :host(.ghost[toggled]:not(.disable-toggle-styling)) button {
                background: var(--button-ghost-toggled-background, var(--button-toggled-background));
                color: var(--button-ghost-toggled-color, var(--button-toggled-color));
                border-width: var(--button-ghost-toggled-border-width, var(--button-toggled-border-width));
                border-style: var(--button-ghost-toggled-border-style, var(--button-toggled-border-style));
                border-color: var(--button-ghost-toggled-border-color, var(--button-toggled-border-color));
                font-weight: var(--button-ghost-toggled-font-weight, var(--button-ghost-font-weight));
                transform: scale(1.02);
            }

            :host(.negative) button {
                background: var(--button-negative-background, var(--button-background));
                color: var(--button-negative-color, var(--button-color));
                text-shadow: var(--text-shadow);
                border-width: var(--button-negative-border-width, var(--button-border-width));
                border-style: var(--button-negative-border-style, var(--button-border-style));
                border-color: var(--button-negative-border-color, var(--button-border-color));
                font-weight: var(--button-negative-font-weight, var(--button-font-weight));
                font-weight: var(--button-negative-toggled-font-weight, var(--button-negative-font-weight));
                --focus-outline-color: var(--button-negative-focus-outline-color);
            }

            :host(.negative[toggled]:not(.disable-toggle-styling)) button {
                background: var(--button-negative-toggled-background, var(--button-toggled-background));
                color: var(--button-negative-toggled-color, var(--button-toggled-color));
                border-width: var(--button-negative-toggled-border-width, var(--button-toggled-border-width));
                border-style: var(--button-negative-toggled-border-style, var(--button-toggled-border-style));
                border-color: var(--button-negative-toggled-border-color, var(--button-toggled-border-color));
                transform: scale(1.02);
            }

            :host(.borderless) button {
                border: none;
            }

            :host(.slim) button {
                padding: var(--button-padding-slim, 0.5em);
            }

            :host(.skinny) button {
                padding: var(--button-padding-skinny, 0.3em);
            }

            :host(.rounded) button {
                border-radius: 2em;
            }

            :host(.not-bold) {
                font-weight: normal;
            }

            button > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
                will-change: transform;
            }

            button > :not(.label) {
                ${mixins.absoluteCenter()};
            }

            button.loading .label,
            button.success .label,
            button.fail .label,
            button:not(.loading) .spinner,
            button:not(.success) .icon-success,
            button:not(.fail) .icon-fail {
                opacity: 0.5;
                transform: scale(0);
            }

            button pl-icon {
                font-size: 120%;
            }

            pl-spinner {
                width: 30px;
                height: 30px;
            }
        `,
    ];

    render() {
        const { state, noTab } = this;
        return html`
            <button
                type="button"
                role="${this.role}"
                class="${state} click hover"
                tabindex="${noTab ? "-1" : ""}"
                aria-label=${this.label}
                aria-pressed=${!!this.toggled}
            >
                <div class="centering spacing horizontal layout label"><slot></slot></div>

                <pl-spinner .active="${state == "loading"}" class="spinner"></pl-spinner>

                <pl-icon icon="check" class="icon-success"></pl-icon>

                <pl-icon icon="cancel" class="icon-fail"></pl-icon>
            </button>
        `;
    }

    static get is() {
        return "pl-button";
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("click", (e: MouseEvent) => {
            if (this.state === "loading") {
                e.stopPropagation();
            }
        });
    }

    protected _toggledChanged() {
        const toggleEl = this.querySelector("pl-toggle") as Toggle;
        if (toggleEl) {
            toggleEl.active = !!this.toggled;
        }
    }

    updated(changes: Map<string, any>) {
        if (changes.has("toggled")) {
            this._toggledChanged();
        }
    }

    start() {
        clearTimeout(this._stopTimeout);
        this.state = "loading";
    }

    stop() {
        this.state = "idle";
    }

    success() {
        this.state = "success";
        this._stopTimeout = window.setTimeout(() => this.stop(), 1000);
    }

    fail() {
        this.state = "fail";
        this._stopTimeout = window.setTimeout(() => this.stop(), 1000);
    }

    focus() {
        this._button.focus();
    }
}
