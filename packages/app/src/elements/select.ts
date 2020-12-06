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
    @property()
    icon: string = "";

    @query("select")
    private _select: HTMLSelectElement;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                padding: 0;
            }

            select {
                width: 100%;
                box-sizing: border-box;
                cursor: pointer;
                padding: var(--button-padding, 0.7em);
                background: var(--button-background, var(--color-shade-1));
                color: var(--button-foreground, var(--color-foreground));
                border-radius: 0.5em;
                border: solid 0.1em var(--color-shade-2);
                border-bottom-width: 0.2em;
                text-shadow: inherit;
                text-align: inherit;
            }

            select.pad-left {
                padding-left: 2.5em;
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
                bottom: 0;
                left: 0.9em;
                margin: auto;
                pointer-events: none;
            }
        `,
    ];

    render() {
        const { options, selected, label, icon } = this;

        return html`
            ${icon ? html` <pl-icon icon=${icon}></pl-icon> ` : ""}

            <select
                id="selectEl"
                class="${icon ? "pad-left" : ""}"
                .selectedIndex=${options.indexOf(selected)}
                @change=${() => this._changed()}
            >
                ${options.map((o) => html` <option>${o}</option> `)}
            </select>

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
