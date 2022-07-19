import { randomArt } from "@padloc/core/src/randomart";
import { getCryptoProvider as getProvider } from "@padloc/core/src/platform";
import { svg } from "lit";
import { until } from "lit/directives/until.js";
import { customElement, property } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { bytesToHex } from "@padloc/core/src/encoding";
import { translate as $l } from "@padloc/locale/src/translate";
import "./popover";
import { shared } from "../styles";

@customElement("pl-fingerprint")
export class Fingerprint extends LitElement {
    @property({ attribute: false })
    key!: Uint8Array;

    private async _grid() {
        const size = 11;
        const fingerprint = await getProvider().fingerprint(this.key);
        const art = randomArt(fingerprint, { width: size, height: size });
        const rects = [];
        for (const [x, line] of art.values.entries()) {
            for (const [y, val] of line.entries()) {
                rects.push(svg`<rect x="${x}" y="${y}" width="1" height="1" opacity="${val / 10}" />`);
            }
        }
        return html`
            <div>
                ${svg`
                    <svg viewBox="0 0 ${size} ${size}">
                        ${rects}
                    </svg>
                `}
            </div>
            <pl-popover trigger="hover" class="padded fp-text">
                <strong>${$l("Public Key Fingerprint")}:</strong> ${bytesToHex(fingerprint)}
            </pl-popover>
        `;
    }

    shouldUpdate() {
        return !!this.key;
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                width: 5em;
                height: 5em;
                position: relative;
                overflow: hidden;
                background: var(--color-background);
                color: var(--color-foreground);
            }

            svg {
                width: 100%;
                height: 100%;
                fill: currentColor;
                pointer-events: none;
            }

            .fp-text {
                max-width: 12em;
                font-size: 0.75rem;
                word-break: break-word;
                padding: 0.5em;
            }
        `,
    ];

    render() {
        return html` ${until(this._grid())} `;
    }
}
