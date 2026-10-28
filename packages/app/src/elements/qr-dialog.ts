import { translate as $l } from "@padloc/locale/src/translate";
import { scanQR, stopScanQR } from "@padloc/core/src/platform";
import { mixins } from "../styles";
import { alert } from "../lib/dialog";
import { Dialog } from "./dialog";
import "./icon";
import { customElement } from "lit/decorators.js";
import { css, html } from "lit";

@customElement("pl-qr-dialog")
export class QRDialog extends Dialog<void, string> {
    private _scanGeneration = 0;
    readonly hideApp = true;

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                ${mixins.fullbleed()};
                border-radius: 0;
                max-width: 100%;
                display: flex;
                flex-direction: column;
                background: transparent;
            }

            .scrim {
                background: transparent;
            }

            header.padded {
                padding-top: max(var(--spacing), env(safe-area-inset-top, 0px));
                padding-left: max(var(--spacing), env(safe-area-inset-left, 0px));
                padding-right: max(var(--spacing), env(safe-area-inset-right, 0px));
            }

            .seeker {
                ${mixins.fullbleed()};
                width: 300px;
                height: 300px;
                border: solid 3px var(--color-negative);
                border-radius: 1em;
                margin: auto;
            }
        `,
    ];

    renderContent() {
        return html`
            <header class="background center-aligning padded horizontal layout">
                <div class="padded large stretch">${$l("Scan QR Code")}</div>
                <pl-button class="round transparent" @click=${() => this.done()}>
                    <pl-icon icon="close"></pl-icon>
                </pl-button>
            </header>
            <canvas></canvas>
            <div class="seeker"></div>
        `;
    }

    async show() {
        const generation = ++this._scanGeneration;
        const result = super.show();
        scanQR().then(
            (res: string) => {
                if (generation === this._scanGeneration) this.done(res);
            },
            (err: Error) => {
                if (generation !== this._scanGeneration) return;
                this.done();
                alert($l("Failed to scan QR code. Error: " + err.toString()), {
                    type: "warning",
                });
            }
        );
        return result;
    }

    done(data?: string) {
        ++this._scanGeneration;
        void stopScanQR().catch(() => {
            void alert($l("Unable to stop the QR scanner. Please close and reopen the app."), { type: "warning" });
        });
        super.done(data);
    }
}
