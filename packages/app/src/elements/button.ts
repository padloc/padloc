import { shared, mixins } from "../styles";
import { BaseElement, element, html, css, property, listen } from "./base";
import "./icon";
import "./spinner";

type ButtonState = "idle" | "loading" | "success" | "fail";
type ButtonRole = "button" | "switch" | "link";

@element("pl-button")
export class Button extends BaseElement {
    @property()
    role: ButtonRole = "button";

    @property({ reflect: true })
    state: ButtonState = "idle";

    @property()
    noTab: boolean = false;

    @property()
    label: string = "";

    @property({ reflect: true })
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
                color: var(--button-foreground, var(--color-foreground));
                border-radius: 0.5em;
                border: solid 0.1em var(--color-shade-2);
                border-bottom-width: 0.2em;
                text-shadow: inherit;
                text-align: inherit;
                transition: transform 0.2s cubic-bezier(0.05, 0.7, 0.03, 3) 0s;
            }

            button:focus-visible {
                border-style: dashed !important;
                border-color: var(--color-focus-highlight, var(--color-highlight)) !important;
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

            :host([toggled]) button {
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

            button > * {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
                will-change: transform;
            }

            button > :not(.label) {
                ${mixins.absoluteCenter()}
            }

            button > .label {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            :host(.vertical) .label {
                flex-direction: column;
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
                class="${state} tap"
                tabindex="${noTab ? "-1" : ""}"
                aria-label=${this.label}
                aria-pressed="${String(this.toggled)}"
            >
                <div class="label"><slot></slot></div>

                <pl-spinner .active="${state == "loading"}" class="spinner"></pl-spinner>

                <pl-icon icon="check" class="icon-success"></pl-icon>

                <pl-icon icon="cancel" class="icon-fail"></pl-icon>
            </button>
        `;
    }

    static get is() {
        return "pl-button";
    }

    @listen("click")
    _click(e: MouseEvent) {
        if (this.state === "loading") {
            e.stopPropagation();
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
