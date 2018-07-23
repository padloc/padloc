// import { PublicKey, getProvider } from "@padlock/core/lib/crypto.js";
import { randomArt } from "@padlock/core/lib/randomart.js";
import { getProvider } from "@padlock/core/lib/crypto.js";
import { BaseElement, html, element, property } from "./base";

@element("pl-fingerprint")
export class Fingerprint extends BaseElement {
    @property({ reflect: true })
    symbols = false;
    @property() key: string = "";

    private async _grid() {
        const fingerprint = await getProvider().fingerprint(this.key);
        const art = randomArt(fingerprint, { width: 11, height: 11 });
        return html`${art.values.map(
            (line, i) => html`
                    <div class="row">
                        ${line.map(
                            (val, j) => html`<div class="cell">
                            <div class="cell-background" style$="opacity: ${val / 10}"></div>
                            <div class="cell-symbol">${art.symbols[i][j]}</div>
                        </div>`
                        )}
                    </div>
                `
        )}`;
    }

    _shouldRender() {
        return !!this.key;
    }

    _render() {
        return html`
            <style>
                :host {
                    display: block;
                    width: 100px;
                    height: 100px;
                    position: relative;
                    overflow: hidden;
                    background: var(--color-background);
                }

                .container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    font-family: var(--font-family-mono);
                }

                .row {
                    display: flex;
                    flex-direction: row;
                    flex: 1;
                }

                .cell {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }

                .cell-background {
                    background: currentColor;
                }

                .cell-symbol {
                    color: var(--color-background);
                    font-weight: bold;
                    text-shadow: none !important;
                    height: 1em;
                    text-align: center;
                    margin: auto;
                }

                .cell-background, .cell-symbol {
                    @apply --fullbleed;
                }

                :host(:not([symbols])) .cell-symbol {
                    display: none;
                }
            </style>

            <div class="container">
                ${this._grid()}
            </div>
        `;
    }
}
