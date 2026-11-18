import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icons } from "../lib/icons";

@customElement("pl-icon")
export class PlIcon extends LitElement {
    @property({ reflect: true })
    icon: string = "";

    @property({ reflect: true })
    weight: "light" | "regular" | "bold" | "" = "";

    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            width: 1.3em;
            height: 1.3em;
            color: inherit;
            font-size: inherit;
            vertical-align: middle;
            --_icon-stroke-width: var(--icon-stroke-width, 1.75px);
        }

        :host([weight="light"]) {
            --_icon-stroke-width: 1.25px;
        }
        :host([weight="regular"]) {
            --_icon-stroke-width: 1.75px;
        }
        :host([weight="bold"]) {
            --_icon-stroke-width: 2.25px;
        }

        svg {
            display: block;
            position: absolute;
            width: 1em;
            height: 1em;
            inset: 0;
            margin: auto;
            transform: scale(1.12);
            fill: none;
            stroke: currentColor;
            stroke-width: var(--_icon-stroke-width);
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        :host(.inline) {
            width: 1em;
            height: 1em;
            vertical-align: -0.15em;
        }

        :host(.large) {
            font-size: 150% !important;
        }
        :host(.big) {
            font-size: 300% !important;
        }
        :host(.huge) {
            font-size: 500% !important;
        }
    `;

    render() {
        const artwork = Object.prototype.hasOwnProperty.call(icons, this.icon) ? icons[this.icon] : icons.custom;
        return this.icon
            ? html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${artwork}</svg>`
            : nothing;
    }
}
