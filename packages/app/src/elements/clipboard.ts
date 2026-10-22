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
    private _operation = 0;
    private _deadline = 0;
    private _showTimeout: number;
    private _writes: Promise<void> | null = null;

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
        const operation = ++this._operation;
        clearInterval(this._interval);
        clearTimeout(this._showTimeout);

        try {
            await this._write(value);
        } catch {
            if (operation === this._operation && this._deadline) this._startCountdown(operation);
            if (operation === this._operation) void this._warn($l("Unable to copy to clipboard. Please try again."));
            return;
        }
        if (operation !== this._operation) return;

        this._resolve && this._resolve();
        this.label = label;
        this._deadline = Date.now() + duration * 1000;
        this._tMinusClear = duration;
        this._startCountdown(operation);
        this._showTimeout = window.setTimeout(() => {
            if (operation === this._operation) this.classList.add("showing");
        }, 10);

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    private _write(value: string) {
        // Preserve the browser fallback's user-gesture context for the first
        // write; only overlapping writes need to wait for an earlier operation.
        const result = this._writes ? this._writes.then(() => setClipboard(value)) : setClipboard(value);
        const pending = result.catch(() => undefined);
        this._writes = pending;
        void pending.then(() => {
            if (this._writes === pending) this._writes = null;
        });
        return result;
    }

    private async _warn(message: string) {
        // Dialogs also import the generator, which imports this component.
        // Load them only on failure to avoid a startup dependency cycle.
        const { alert } = await import("../lib/dialog");
        await alert(message, { type: "warning" });
    }

    private _startCountdown(operation: number) {
        this._interval = window.setInterval(() => {
            if (operation !== this._operation) return;
            const dt = this._deadline - Date.now();
            if (dt <= 0) {
                void this.clear();
            } else {
                this._tMinusClear = Math.floor(dt / 1000);
            }
        }, 1000);
    }

    async clear() {
        const operation = ++this._operation;
        clearInterval(this._interval);
        clearTimeout(this._showTimeout);
        try {
            await this._write(" ");
        } catch {
            // Keep the clear control visible so a failed native write can be retried.
            if (operation === this._operation) {
                this.classList.add("showing");
                void this._warn($l("Unable to clear the clipboard. Please try again."));
            }
            return;
        }
        if (operation !== this._operation) return;
        this._deadline = 0;
        this.classList.remove("showing");
        this._resolve && this._resolve();
        this._resolve = null;
    }
}
