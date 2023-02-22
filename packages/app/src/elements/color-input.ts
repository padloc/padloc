import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { Popover } from "./popover";
import "./color-picker";
import { shared } from "../styles";

export { defaultColors } from "./color-picker";

@customElement("pl-color-input")
export class ColorInput extends LitElement {
    @property()
    get value() {
        return this._input && this._input.value;
    }
    set value(val: string) {
        (async () => {
            if (!this._input) {
                await this.updateComplete;
            }
            this._input.value = val;
        })();
        this.style.setProperty("--color-highlight", val || "initial");
    }

    @property()
    name: string;

    @property({ type: Boolean })
    required: boolean;

    @query("input")
    _input: HTMLInputElement;

    @query("pl-popover")
    _popover: Popover;

    private _valueSelected(value: string) {
        this.value = value;
        this._popover.hide();
    }

    static styles = [
        shared,
        css`
            :host {
                display: flex;
            }

            input {
                position: absolute;
                opacity: 0;
                pointer-events: none;
            }

            button {
                width: 1.8em;
                height: 1.8em;
                border-radius: 0.5em;
                background: var(
                    --color-highlight,
                    linear-gradient(to top right, white 0%, white 47%, black 48%, black 52%, white 53%, white 100%)
                );
                border: solid 1px var(--color-shade-2);
                cursor: pointer;
            }
        `,
    ];

    render() {
        return html`
            <input .name=${this.name || ""} ?required=${this.required} tabindex="-1" />
            <button type="button"></button>
            <pl-popover class="padded">
                <pl-color-picker
                    .value=${this.value}
                    @change=${(e: CustomEvent<{ value: string }>) => this._valueSelected(e.detail.value)}
                ></pl-color-picker>
            </pl-popover>
        `;
    }
}
