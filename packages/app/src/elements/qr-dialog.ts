import { translate as $l } from "@padloc/locale/src/translate";
import { scanQR, stopScanQR } from "@padloc/core/src/platform";
import { mixins } from "../styles";
import { alert } from "../lib/dialog";
import { element, html, css } from "./base";
import { Dialog } from "./dialog";
import { View } from "./view";
import "./icon";

@element("pl-qr-dialog")
export class QRDialog extends Dialog<void, string> {
    readonly hideApp = true;

    static styles = [
        ...Dialog.styles,
        ...View.styles,
        css`
            .inner {
                ${mixins.fullbleed()}
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
                ${mixins.fullbleed()}
                width: 300px;
                height: 300px;
                border: solid 3px var(--color-negative);
                border-radius: var(--border-radius);
                margin: auto;
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <pl-icon></pl-icon>
                <div class="title flex">
                    ${$l("Scan QR Code")}
                </div>
                <pl-icon class="tap" icon="close" @click=${() => this.done()}></pl-icon>
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
                    type: "warning"
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
