import { shared } from "../styles";
import { BaseElement, element, html, css, property, query, observe } from "./base";

@element("pl-select")
export class Select<T> extends BaseElement {
    @property()
    options: T[] = [];
    @property()
    selected: T;
    @property()
    label: string = "";

    @query("select")
    private _select: HTMLSelectElement;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                padding: 0;
                height: var(--row-height);
                padding: 0 15px;
                background: var(--shade-2-color);
                border-radius: var(--border-radius);
            }

            select {
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                cursor: pointer;
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
                width: 20px;
                height: 20px;
                top: 0;
                right: 5px;
                bottom: 0;
                margin: auto;
                pointer-events: none;
            }
        `
    ];

    render() {
        const { options, selected, label } = this;

        return html`
            <select id="selectEl" .selectedIndex=${options.indexOf(selected)} @change=${() => this._changed()}>
                ${options.map(
                    o => html`
                        <option>${o}</option>
                    `
                )}
            </select>

            <pl-icon icon="dropdown"></pl-icon>

            <label for="selectEl" float>${label}</label>
        `;
    }

    @observe("options")
    @observe("selected")
    async _propsChanged() {
        if (!this.selected) {
            this.selected = this.options[0];
        }
        await this.updateComplete;
        this._select.selectedIndex = this.options.indexOf(this.selected);
    }

    private _changed() {
        this.selected = this.options[this._select.selectedIndex];
        this.dispatch("change");
    }
}
