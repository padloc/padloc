import { shared, mixins } from "../styles";
import { BaseElement, element, html, css, property, query } from "./base";
import { Toggle } from "./toggle";

@element("pl-toggle-button")
export class ToggleButton extends BaseElement {
    @property()
    active: boolean = false;
    @property({ reflect: true })
    reverse: boolean = false;
    @property()
    label: string = "";

    @query("pl-toggle")
    _toggle: Toggle;

    static styles = [
        shared,
        css`
            :host {
                display: block;
                font-size: inherit;
                padding: 12px 15px;
            }

            button {
                background: transparent;
                display: flex;
                width: 100%;
                align-items: center;
                height: 100%;
                padding: 0;
                line-height: normal;
                text-align: left;
            }

            button > div {
                flex: 1;
                ${mixins.ellipsis()}
            }

            :host(:not([reverse])) button > div {
                padding-left: 0.5em;
            }

            :host([reverse]) button > div {
                padding-right: 0.5em;
            }

            :host([reverse]) button {
                flex-direction: row-reverse;
            }

            pl-toggle {
                display: inline-block;
                pointer-events: none;
            }
        `
    ];

    render() {
        const { active, label } = this;
        return html`
        <button @click=${() => this.toggle()}>

            <pl-toggle .active=${active} @change=${() => (this.active = this._toggle.active)}"></pl-toggle>

            <div>
                ${label}
                <slot></slot>
            </div>

        </button>
`;
    }

    toggle() {
        this._toggle.toggle();
    }
}
