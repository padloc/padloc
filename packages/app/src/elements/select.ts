import { shared } from "../styles";
import { BaseElement, element, html, css, property, query, observe } from "./base";

@element("pl-select")
export class Select<T> extends BaseElement {
    @property()
    options: T[] = [];

    @property()
    selected: T;

    @property({ reflect: true })
    label?: string;

    @property()
    icon?: string;

    @query("select")
    private _select: HTMLSelectElement;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                padding: 0;
                --padding: var(--button-padding, 0.7em);
            }

            select {
                width: 100%;
                box-sizing: border-box;
                cursor: pointer;
                padding: var(--padding);
                background: var(--button-background, var(--color-shade-1));
                color: var(--button-foreground, var(--color-foreground));
                border-radius: 0.5em;
                border: solid 0.1em var(--color-shade-2);
                border-bottom-width: 0.2em;
                text-shadow: inherit;
                text-align: inherit;
                appearance: none;
                -webkit-appearance: none;
                font-weight: bold;
            }

            label {
                position: absolute;
                font-size: var(--font-size-tiny);
                top: 0.6em;
                left: 1.2em;
                pointer-events: none;
                color: var(--color-highlight);
            }

            .button-icon {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0.9em;
                margin: auto;
                pointer-events: none;
            }

            .dropdown-icon {
                position: absolute;
                top: 0;
                bottom: 0;
                right: 0.5em;
                margin: auto;
                pointer-events: none;
            }

            :host([label]) select {
                padding-top: calc(var(--padding) + 0.5em);
                padding-bottom: calc(var(--padding) - 0.5em);
            }

            :host([icon]) select {
                padding-left: 2.5em;
            }

            :host([icon]) label {
                left: 3.75em;
            }
        `,
    ];

    render() {
        const { options, selected, label, icon } = this;

        return html`
            ${icon ? html` <pl-icon icon=${icon} class="button-icon"></pl-icon> ` : ""}

            <select class="tap" .selectedIndex=${options.indexOf(selected)} @change=${() => this._changed()}>
                ${options.map((o) => html` <option>${o}</option> `)}
            </select>

            <pl-icon icon="dropdown" class="dropdown-icon"></pl-icon>

            <label>${label}</label>
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
