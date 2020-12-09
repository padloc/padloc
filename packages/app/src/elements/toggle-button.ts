import { shared } from "../styles";
import { BaseElement, element, html, css, property, query } from "./base";
import { Toggle } from "./toggle";
import "./button";

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
            pl-toggle {
                display: inline-block;
                pointer-events: none;
            }
        `,
    ];

    render() {
        const { active, label } = this;
        return html`
        <pl-button class="horizontal center-aligning spacing layout" @click=${() => this.toggle()}>

            <div class="text-left-aligning stretch ellipsis">
                ${label}
                <slot></slot>
            </div>

            <pl-toggle .active=${active} @change=${() => (this.active = this._toggle.active)}"></pl-toggle>

        </pl-button>
`;
    }

    toggle() {
        this._toggle.toggle();
    }
}
