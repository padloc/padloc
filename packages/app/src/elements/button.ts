import { shared, mixins } from "../styles";
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
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

    private _stopTimeout: number;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                font-weight: bold;
                text-align: center;
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
                background: var(--button-background, var(--color-shade-1));
                color: var(--button-foreground, currentColor);
                border-radius: 0.5em;
                border: solid 0.1em var(--color-shade-2);
                border-bottom-width: 0.2em;
                text-shadow: inherit;
                text-align: inherit;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
            }

            :host(.transparent) button {
                background: var(--button-background, transparent);
                border-width: 1px;
                border-color: transparent;
            }

            :host(.round) button {
                border-radius: 100%;
            }

            :host(.primary) button {
                background: var(--color-highlight);
                color: var(--color-white);
                --color-focus-highlight: var(--color-white);
                text-shadow: var(--text-shadow);
            }

            :host([toggled]:not(.disable-toggle-styling)) button {
                background: var(--button-toggled-background, var(--color-highlight));
                color: var(--button-toggled-foreground, var(--color-white));
                transform: scale(1.02);
                text-shadow: var(--text-shadow);
            }

            :host(.negative) button {
                background: var(--color-negative);
                color: var(--color-white);
                text-shadow: var(--text-shadow);
            }

            :host(.borderless) button {
                border: none;
            }

            :host(.slim) button {
                padding: 0.5em;
            }

            :host(.skinny) button {
                padding: 0.3em;
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
}
