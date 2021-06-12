import "./icon";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { shared } from "../styles";

@customElement("pl-select")
export class Select<T> extends LitElement {
    @property({ attribute: false })
    options: T[] = [];

    @property({ attribute: false })
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
                padding-right: calc(var(--padding) + 1.5em);
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

            :host(.transparent) select {
                background: transparent;
                border: none;
            }

            label {
                position: absolute;
                font-size: var(--font-size-tiny);
                top: 0.6em;
                left: 1.2em;
                pointer-events: none;
                color: var(--color-highlight);
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
        `,
    ];

    render() {
        const { options, selected, label, icon } = this;

        return html`
            <select class="tap" .selectedIndex=${options.indexOf(selected)} @change=${() => this._changed()}>
                ${options.map((o) => html` <option>${o}</option> `)}
            </select>

            <pl-icon icon="dropdown" class="dropdown-icon"></pl-icon>

            <label class="horizontal spacing center-aligning layout">
                ${icon ? html` <pl-icon icon=${icon} class="small"></pl-icon> ` : ""}
                <div>${label}</div>
            </label>
        `;
    }

    updated(changes: Map<string, any>) {
        if (changes.has("options") || changes.has("selected")) {
            this._propsChanged();
        }
    }

    async _propsChanged() {
        if (!this.selected) {
            this.selected = this.options[0];
        }
        await this.updateComplete;
        this._select.selectedIndex = this.options.indexOf(this.selected);
    }

    private _changed() {
        this.selected = this.options[this._select.selectedIndex];
        this.dispatchEvent(new CustomEvent("change"));
    }
}
