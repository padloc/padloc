import { BaseElement, element, html, css, property, query } from "./base";
import { shared } from "../styles";

@element("pl-slider")
export class Slider extends BaseElement {
    @property() min: number = 1;
    @property() max: number = 10;
    @property() value: number = this.min;
    @property() unit: string = "";
    @property() step: number = 1;
    @property() label: string = "";
    @property() hideValue: boolean = false;

    @query("input") private _input: HTMLInputElement;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                align-items: center;
                height: var(--row-height);
                padding: 0 15px;
                font-size: inherit;
                --track-color: var(--slider-track-color, rgba(0, 0, 0, 0.1));
                --knob-color: var(--slider-knob-color, var(--color-highlight));
                --track-size: var(--slider-track-size, 2px);
                --knob-size: var(--slider-knob-size, 25px);
            }

            input[type="range"] {
                -webkit-appearance: none;
                width: 100%;
                margin: 0;
                padding: 0;
                flex: 1;
                height: auto;
                min-height: var(--knob-size);
            }

            input[type="range"]:focus {
                outline: none;
            }

            label {
                margin-right: 10px;
            }

            label:empty {
                display: none;
            }

            .value-display {
                margin-left: 10px;
            }

            input[type="range"]::-webkit-slider-runnable-track {
                width: 100%;
                height: var(--track-size);
                cursor: pointer;
                background: var(--track-color);
                border-radius: 100%;
            }

            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                height: var(--knob-size);
                width: var(--knob-size);
                margin-top: calc(0.5 * var(--track-size) - 0.5 * var(--knob-size));
                position: relative;
                border-radius: 100%;
                background: var(--knob-color);
                cursor: pointer;
                border: none;
                box-sizing: border-box;
                background-clip: content-box;
            }

            input[type="range"]:active::-webkit-slider-thumb {
                transform: scale(1.1);
            }

            input[type="range"]::-moz-range-track {
                width: 100%;
                height: var(--track-size);
                cursor: pointer;
                background: var(--track-color);
                border-radius: 100%;
            }

            input[type="range"]::-moz-range-thumb {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                height: var(--knob-size);
                width: var(--knob-size);
                margin-top: calc(0.5 * var(--track-size) - 0.5 * var(--knob-size));
                position: relative;
                border-radius: 100%;
                background: var(--knob-color);
                cursor: pointer;
                border: none;
                box-sizing: border-box;
                background-clip: content-box;
            }

            input[type="range"]:active::-moz-range-thumb {
                transform: scale(1.1);
            }
        `
    ];

    render() {
        return html`
            <label>${this.label}</label>

            <input
                type="range"
                .value=${this.value}
                .min=${this.min}
                .max=${this.max}
                .step=${this.step}
                @input=${() => this._inputChange()}
            />

            <span class="value-display" ?hidden=${this.hideValue}>${this.value}${this.unit}</span>
        `;
    }

    private _inputChange() {
        const prev = this.value;
        this.value = parseFloat(this._input.value);
        this.dispatch("change", { prev: prev, value: this.value }, true, true);
    }
}
