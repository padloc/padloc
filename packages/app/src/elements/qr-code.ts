import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { until } from "lit-html/directives/until";
import { toDataURL } from "qrcode";
import "./spinner";

@customElement("pl-qr-code")
export class QRCode extends LitElement {
    @property()
    value: string;

    @property({ type: Number })
    scale: number;

    static styles = [
        css`
            :host {
                display: block;
                width: 5em;
                height: 5em;
            }

            img,
            pl-spinner {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
        `,
    ];

    private async _renderImage() {
        if (!this.value) {
            return;
        }
        const data = await toDataURL(this.value, { errorCorrectionLevel: "low", margin: 0, scale: this.scale });
        return html`
            <img src="${data}"></img>
        `;
    }

    render() {
        return until(this._renderImage(), html`<pl-spinner active></pl-spinner>`);
    }
}
