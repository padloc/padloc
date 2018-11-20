import { shared } from "../styles";
import { BaseElement, element, html, property, query } from "./base.js";

@element("pl-select")
export class Select<T> extends BaseElement {
    @property()
    options: T[] = [];
    @property()
    selected: T | null = null;
    @property()
    label: string = "";

    @query("select")
    private _select: HTMLSelectElement;

    render() {
        const { options, selected, label } = this;

        return html`
            ${shared}

            <style>
                :host {
                    display: block;
                    position: relative;
                    padding: 0 8px;
                }

                select {
                    width: 100%;
                    height: var(--row-height);
                }

                label {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    padding: 13px;
                    opacity: 0.5;
                    transition: transform 0.2s, color 0.2s, opacity 0.5s;
                    cursor: text;
                    pointer-events: none;
                }

                label[float] {
                    transform: scale(0.8) translate(0, -32px);
                    color: var(--color-highlight);
                    font-weight: bold;
                    opacity: 1;
                }
            </style>

            <select id="selectEl" @change=${() => this._changed()}>
                ${options.map(
                    o => html`
                    <option ?selected=${selected === o}>${o}</option>
                `
                )}
            </select>

            <label for="selectEl" float>${label}</label>

        `;
    }

    _changed() {
        this.selected = this.options[this._select.selectedIndex];
        this.dispatch("change");
    }
}
