import { LitElement, html } from "@polymer/lit-element";
import { Record, Field } from "@padlock/core/lib/data.js";
import { setClipboard } from "@padlock/core/lib/platform.js";
import { localize as $l } from "@padlock/core/lib/locale.js";
import sharedStyles from "../styles/shared.js";

export class Clipboard extends LitElement {

    static get properties() {
        return {
            record: Object,
            field: Object
        };
    }

    _shouldRender(props: {record?: Record, field?: Field}) {
        return !!props.record && !!props.field;
    }

    _render(props: {record: Record, field: Field}) {
        return html`
        <style>
            ${ sharedStyles }

            :host {
                display: flex;
                text-align: center;
                transition: transform 0.5s cubic-bezier(1, -0.3, 0, 1.3);
                position: fixed;
                left: 15px;
                right: 15px;
                bottom: 15px;
                z-index: 10;
                max-width: 400px;
                margin: 0 auto;
                border-radius: var(--border-radius);
                background: linear-gradient(90deg, rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                color: var(--color-background);
                text-shadow: rgba(0, 0, 0, 0.2) 0 2px 0;
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
            <div class="name">${ props.record.name } / ${ props.field.name }</div>
        </div>

        <button class="tiles-2 tap" on-click="${ () => this.clear() }">
            <div><strong>${ $l("Clear") }</strong></div>
            <div class="countdown">${ this._tMinusClear }s</div>
        </button>
`;
    }

    set(record: Record, field: Field, duration = 60) {
        clearInterval(this._interval);

        this.record = record;
        this.field = field;
        setClipboard(field.value);

        this.classList.add("showing");

        const tStart = Date.now();

        this._tMinusClear = duration;
        this._interval = setInterval(() => {
            const dt = tStart + duration * 1000 - Date.now();
            if (dt <= 0) {
                this.clear();
            } else {
                this._tMinusClear = Math.floor(dt / 1000);
            }
            this.requestRender();
        }, 1000);

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    clear() {
        clearInterval(this._interval);
        setClipboard(" ");
        this.classList.remove("showing");
        typeof this._resolve === "function" && this._resolve();
        this._resolve = null;
    }
}

window.customElements.define("pl-clipboard", Clipboard);
