import { styleMap } from "lit-html/directives/style-map";
import { VaultItem, Field } from "@padloc/core/src/item";
import { setClipboard } from "@padloc/core/src/platform";
import { shared, mixins } from "../styles";
import "./icon";
import "./button";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";

@customElement("pl-clipboard")
export class Clipboard extends LitElement {
    @property({ attribute: false })
    item: VaultItem | null = null;

    @property({ attribute: false })
    field: Field | null = null;

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
                ${mixins.textShadow()};
            }

            :host(:not(.showing)) {
                transform: translateY(150%);
            }

            .inner {
                background: var(--color-highlight);
                color: var(--color-white);
                border-radius: 0.5em;
                pointer-events: auto;
                max-width: 100%;
                box-shadow: rgba(0, 0, 0, 0.3) 0 1px 2px;
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
                stroke-width: 0.8;
                stroke-dasharray: 25;
                stroke-linecap: round;
                transition: stroke-dashoffset 1s linear;
            }

            .countdown,
            .clear-icon {
                transition: transform 0.2s cubic-bezier(1, -0.3, 0, 1.3), opacity 0.2s;
            }

            .clear-icon {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .countdown-button:hover .countdown,
            .countdown-button:not(:hover) .clear-icon {
                opacity: 0;
                transform: scale(0);
            }

            @supports (-webkit-overflow-scrolling: touch) {
                :host {
                    bottom: calc(env(safe-area-inset-bottom) / 1.5);
                }
            }
        `,
    ];

    render() {
        const { item, field, _tMinusClear } = this;
        const itemName = item && item.name;
        const fieldName = field && field.name;

        return html`
            <div class="padded horizontal center-aligning spacing layout inner">
                <pl-icon icon="clipboard"></pl-icon>

                <div class="stretch">${itemName} / ${fieldName}</div>

                <pl-button class="transparent slim round countdown-button" @click=${() => this.clear()}>
                    <svg class="countdown-wheel" viewBox="0 0 10 10">
                        <defs>
                            <filter id="shadow">
                                <feOffset dx="-0.3" in="SourceAlpha" result="shadowOffsetOuter1" />
                                <feColorMatrix
                                    values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.2 0"
                                    in="shadowOffsetOuter1"
                                />
                            </filter>
                        </defs>

                        <circle
                            filter="url(#shadow)"
                            cx="5"
                            cy="5"
                            r="4"
                            style=${styleMap({ strokeDashoffset: ((1 - _tMinusClear / 60) * 25).toString() })}
                        />

                        <circle
                            cx="5"
                            cy="5"
                            r="4"
                            style=${styleMap({ strokeDashoffset: ((1 - _tMinusClear / 60) * 25).toString() })}
                        />
                    </svg>

                    <div class="small countdown">${_tMinusClear}s</div>

                    <pl-icon class="clear-icon" icon="cancel"></pl-icon>
                </pl-button>
            </div>
        `;
    }

    async set(item: VaultItem, field: Field, duration = 60) {
        clearInterval(this._interval);

        this.item = item;
        this.field = field;

        const value = await field.transform();
        setClipboard(value);

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
