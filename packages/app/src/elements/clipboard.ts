import { VaultItem, Field } from "@padloc/core/lib/item.js";
import { setClipboard } from "@padloc/core/lib/platform.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { BaseElement, html, property } from "./base.js";

export class Clipboard extends BaseElement {

    @property() item: VaultItem | null = null;
    @property() field: Field | null = null;
    @property() private _tMinusClear: number = 0;

    private _interval: number;
    private _resolve: (() => void) | null = null;

    shouldUpdate() {
        return !!this.item && !!this.field;
    }

    render() {
        const { item, field, _tMinusClear } = this;
        return html`
        ${ shared }

        <style>

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
            }

            .countdown {
                font-size: var(--font-size-small);
            }
        </style>

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

    set(item: VaultItem, field: Field, duration = 60) {
        clearInterval(this._interval);

        this.item = item;
        this.field = field;
        setClipboard(field.value);

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

window.customElements.define("pl-clipboard", Clipboard);
