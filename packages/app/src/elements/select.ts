import { shared } from "../styles";
import { BaseElement, element, html, property, query, observe } from "./base.js";

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
                    padding: 0;
                }

                select {
                    width: 100%;
                    height: var(--row-height);
                    cursor: pointer;
                    padding: 0 15px;
                }

                option {
                    background-color: var(--color-tertiary);
                    color: var(--color-secondary);
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

                pl-icon {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    margin: auto;
                    pointer-events: none;
                }
            </style>

            <select id="selectEl" @change=${() => this._changed()}>
                ${options.map(
                    o => html`
                    <option ?selected=${selected === o}>${o}</option>
                `
                )}
            </select>

            <pl-icon icon="dropdown"></pl-icon>

            <label for="selectEl" float>${label}</label>

        `;
    }

    @observe("options")
    private _changed() {
        this.selected = this.options[this._select.selectedIndex];
        this.dispatch("change");
    }
}
