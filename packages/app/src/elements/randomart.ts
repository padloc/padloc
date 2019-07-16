import { randomArt } from "@padloc/core/src/randomart";
import { getCryptoProvider as getProvider } from "@padloc/core/src/platform";
import { svg } from "lit-html";
import { until } from "lit-html/directives/until";
import { BaseElement, html, css, element, property } from "./base";

@element("pl-fingerprint")
export class Fingerprint extends BaseElement {
    @property()
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
        return svg`
            <svg viewBox="0 0 ${size} ${size}">
                ${rects}
            </svg>
        `;
    }

    shouldUpdate() {
        return !!this.key;
    }

    static styles = [
        css`
            :host {
                display: block;
                width: 100px;
                height: 100px;
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
        `
    ];

    render() {
        return html`
            ${until(this._grid())}
        `;
    }
}
