import { translate as $l } from "@padloc/locale/src/translate";
import { scanQR, stopScanQR } from "@padloc/core/src/platform";
import { mixins } from "../styles";
import { alert } from "../lib/dialog";
import { Dialog } from "./dialog";
import "./icon";
import { customElement } from "lit/decorators";
import { css, html } from "lit";

@customElement("pl-qr-dialog")
export class QRDialog extends Dialog<void, string> {
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
        scanQR().then(
            (res: string) => this.done(res),
            (err: Error) => {
                this.done();
                alert($l("Failed to scan QR code. Error: " + err.toString()), {
                    type: "warning",
                });
            }
        );
        return super.show();
    }

    done(data?: string) {
        stopScanQR();
        super.done(data);
    }
}
