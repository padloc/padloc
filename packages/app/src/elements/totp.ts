import { styleMap } from "lit-html/directives/style-map.js";
import { hotp } from "@padloc/core/src/otp";
import { base32ToBytes } from "@padloc/core/src/encoding";
import { shared } from "../styles";
import { BaseElement, element, html, svg, css, property } from "./base";
import "./icon";

@element("pl-totp")
export class TOTP extends BaseElement {
    @property()
    secret: string = "";

    @property()
    interval = 30;

    @property()
    private _token = "";

    @property()
    private _age = 0;

    private _counter = 0;
    private _updateTimeout = -1;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                align-items: center;
                user-select: text;
                -webkit-user-select: text;
                font: inherit;
            }

            .countdown {
                width: 1em;
                height: 1em;
                margin-left: 0.3em;
                border-radius: 100%;
            }

            .countdown circle {
                transform-origin: center center;
                transform: rotate(-90deg);
                fill: none;
                stroke: currentColor;
                stroke-width: 8;
                stroke-dasharray: 25;
                transition: stroke-dashoffset 1s linear;
            }

            .countdown circle.bg {
                opacity: 0.2;
            }
        `
    ];

    async _update(updInt = 2000) {
        window.clearTimeout(this._updateTimeout);

        const time = Date.now();

        const counter = Math.floor(time / 1000 / this.interval);
        if (counter !== this._counter) {
            this._token = await hotp(base32ToBytes(this.secret), counter);
            this._counter = counter;
        }

        this._age = ((Date.now() / 1000) % this.interval) / this.interval;

        if (updInt) {
            this._updateTimeout = window.setTimeout(() => this._update(updInt), updInt);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._update();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.clearTimeout(this._updateTimeout);
    }

    render() {
        return html`
            <span>
                ${this._token.substring(0, 3)}&nbsp;${this._token.substring(3, 6)}
            </span>
            ${svg`
                <svg class="countdown" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" class="bg" />
                    <circle
                        cx="5"
                        cy="5"
                        r="4"
                        style=${styleMap({ strokeDashoffset: Math.floor(this._age * -25).toString() })}
                    />
                </svg>
            `}
        `;
    }
}
