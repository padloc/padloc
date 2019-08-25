import { VaultItem, Field } from "@padloc/core/src/item";
import { setClipboard } from "@padloc/core/src/platform";
import { translate as $l } from "@padloc/locale/src/translate";
import { totp } from "@padloc/core/src/otp";
import { base32ToBytes } from "@padloc/core/src/encoding";
import { shared, mixins } from "../styles";
import { BaseElement, element, html, css, property } from "./base";

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
                text-align: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 15px;
                right: 15px;
                bottom: 15px;
                z-index: 100;
                max-width: 400px;
                margin: 0 auto;
                border-radius: var(--border-radius);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
                ${ mixins.gradientHighlight(true) }
            }

            :host(:not(.showing)) {
                transform: translateY(130%);
            }

            .content {
                flex: 1;
                padding: 15px;
            }

            .name {
                font-weight: bold;
            }

            button {
                height: auto;
                line-height: normal;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border-radius: 0 var(--border-radius) var(--border-radius) 0;
            }

            .countdown {
                font-size: var(--font-size-small);
            }
        `
    ];

    render() {
        const { item, field, _tMinusClear } = this;
        return html`
        <div class="content">
            <div class="title">${ $l("Copied To Clipboard:") }</div>
            <div class="name">${ item!.name } / ${ field!.name }</div>
        </div>

        <button class="tiles-2 tap" @click=${ () => this.clear() }>
            <div><strong>${ $l("Clear") }</strong></div>
            <div class="countdown">${ _tMinusClear }s</div>
        </button>
`;
    }

    async set(item: VaultItem, field: Field, duration = 60) {
        clearInterval(this._interval);

        this.item = item;
        this.field = field;

        const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
        setClipboard(value);

        this.classList.add("showing");

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
