import { styleMap } from "lit-html/directives/style-map";
import { VaultItem, Field } from "@padloc/core/src/item";
import { setClipboard } from "@padloc/core/src/platform";
import { totp } from "@padloc/core/src/otp";
import { base32ToBytes } from "@padloc/core/src/encoding";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, css, property } from "./base";
import "./icon";

@element("pl-clipboard")
export class Clipboard extends BaseElement {
    @property() item: VaultItem | null = null;
    @property() field: Field | null = null;
    @property() private _tMinusClear: number = 0;

    private _interval: number;
    private _resolve: (() => void) | null = null;

    shouldUpdate() {
        return !!this.item && !!this.field;
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                justify-content: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 70px;
                right: 70px;
                bottom: 15px;
                z-index: 100;
                pointer-events: none;
            }

            .inner {
                display: flex;
                align-items: center;
                border-radius: var(--border-radius);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 1px 0;
                max-width: 100%;
                box-shadow: rgba(0, 0, 0, 0.3) 0 1px 2px;
                ${mixins.gradientHighlight(true)}
                pointer-events: auto;
            }

            pl-icon {
                flex: none;
            }

            :host(:not(.showing)) {
                transform: translateY(150%);
            }

            .content {
                flex: 1;
                padding: 15px;
            }

            .name {
                font-weight: bold;
                flex-grow: 1;
                font-size: var(--font-size-tiny);
                line-height: 15px;
                margin: 4px 4px 4px 0;
                text-align: center;
            }

            .clear-button {
                padding: 0;
                width: 36px;
                height: 36px;
                margin: 4px;
                line-height: normal;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border-radius: 100%;
                font-size: 10px;
                flex: none;
                background: transparent;
                position: relative;
                font-weight: bold;
            }

            .countdown {
                ${mixins.fullbleed()}
                width: 32px;
                height: 32px;
                margin: auto;
                border-radius: 100%;
            }

            .countdown circle {
                transform-origin: center center;
                transform: rotate(-90deg);
                fill: none;
                stroke: currentColor;
                stroke-width: 0.8;
                stroke-dasharray: 25;
                stroke-linecap: round;
                transition: stroke-dashoffset 1s linear;
            }

            @supports (-webkit-overflow-scrolling: touch) {
                :host {
                    left: 80px;
                    right: 80px;
                    bottom: calc(env(safe-area-inset-bottom) / 1.5);
                }
            }
        `
    ];

    render() {
        const { item, field, _tMinusClear } = this;
        return html`
            <div class="inner">
            <pl-icon icon="clipboard"></pl-icon>

            <div class="name">${item!.name} / ${field!.name}</div>

            <button class="clear-button tap" @click=${() => this.clear()}>
                <svg class="countdown" viewBox="0 0 10 10">
                    <defs>
                        <filter id="shadow">
                            <feOffset dx="-0.3" in="SourceAlpha" result="shadowOffsetOuter1"/>
                            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.2 0" in="shadowOffsetOuter1"/>
                        </filter>
                    </defs>

                    <circle
                        filter="url(#shadow)"
                        cx="5"
                        cy="5"
                        r="4"
                        style=${styleMap({ strokeDashoffset: ((1 - (_tMinusClear / 60)) * 25).toString() })}
                    />

                    <circle
                        cx="5"
                        cy="5"
                        r="4"
                        style=${styleMap({ strokeDashoffset: ((1 - (_tMinusClear / 60)) * 25).toString() })}
                    />
                </svg>

                <div>
                    ${_tMinusClear}s
                </div>
            </button>
            </div>
        `;
    }

    async set(item: VaultItem, field: Field, duration = 60) {
        clearInterval(this._interval);

        this.item = item;
        this.field = field;

        const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
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

        return new Promise(resolve => {
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
