import { styleMap } from "lit/directives/style-map.js";
import { setClipboard } from "@padloc/core/src/platform";
import { shared } from "../styles";
import "./icon";
import "./button";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { $l } from "@padloc/locale/src/translate";

@customElement("pl-clipboard")
export class Clipboard extends LitElement {
    @property({ attribute: false })
    label: string = "";

    @state()
    private _tMinusClear: number = 0;

    private _interval: number;
    private _resolve: ((...args: any[]) => void) | null = null;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                justify-content: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: calc(2 * var(--spacing));
                right: calc(2 * var(--spacing));
                bottom: calc(2 * var(--spacing));
                z-index: 100;
                pointer-events: none;
            }

            :host(:not(.showing)) {
                transform: translateY(150%);
            }

            .inner {
                background: var(--color-background-dark);
                border-radius: 0.5em;
                pointer-events: auto;
                max-width: 100%;
                box-shadow: rgba(0, 0, 0, 0.1) 0 0.3em 1em -0.2em, var(--border-color) 0 0 0 1px;
            }

            .countdown-wheel {
                position: absolute;
                width: 2.5em;
                height: 2.5em;
                margin: auto;
                border-radius: 100%;
            }

            .countdown-wheel circle {
                transform-origin: center center;
                transform: rotate(-90deg);
                fill: none;
                stroke: currentColor;
                stroke-width: 0.5;
                stroke-dasharray: 25;
                stroke-linecap: round;
                transition: stroke-dashoffset 1s linear;
            }

            .countdown {
                width: 2.5em;
                height: 2.5em;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                :host {
                    bottom: calc(2 * var(--spacing) + var(--inset-bottom));
                }
            }
        `,
    ];

    render() {
        const { label, _tMinusClear } = this;

        return html`
            <div class="padded horizontal center-aligning spacing layout inner" tabindex="-1">
                <div class="relative">
                    <svg class="countdown-wheel" viewBox="0 0 10 10">
                        <circle
                            cx="5"
                            cy="5"
                            r="4"
                            style=${styleMap({ strokeDashoffset: ((1 - _tMinusClear / 60) * 25).toString() })}
                        />
                    </svg>

                    <div class="countdown centering layout">
                        <div class="tiny">${_tMinusClear}s</div>
                    </div>
                </div>

                <div class="stretch">
                    <div class="tiny highlighted">
                        <pl-icon icon="clipboard" class="inline"></pl-icon> ${$l("Copied To Clipboard")}
                    </div>
                    <div>${label}</div>
                </div>

                <pl-button class="transparent slim round countdown-button" @click=${() => this.clear()}>
                    <pl-icon class="clear-icon" icon="cancel"></pl-icon>
                </pl-button>
            </div>
        `;
    }

    async set(value: string, label = value, duration = 60) {
        clearInterval(this._interval);

        setClipboard(value);
        this.label = label;

        const tStart = Date.now();

        this._tMinusClear = duration;
        this._interval = window.setInterval(() => {
            const dt = tStart + duration * 1000 - Date.now();
            if (dt <= 0) {
                this.clear();
            } else {
                this._tMinusClear = Math.floor(dt / 1000);
            }
        }, 1000);

        setTimeout(() => this.classList.add("showing"), 10);

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    clear() {
        clearInterval(this._interval);
        setClipboard(" ");
        this.classList.remove("showing");
        this._resolve && this._resolve();
        this._resolve = null;
    }
}
