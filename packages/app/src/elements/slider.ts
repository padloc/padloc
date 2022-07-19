import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { shared } from "../styles";

@customElement("pl-slider")
export class Slider extends LitElement {
    @property({ type: Number }) min: number = 1;
    @property({ type: Number }) max: number = 10;
    @property({ type: Number }) value: number = this.min;
    @property() unit: string = "";
    @property({ type: Number }) step: number = 1;
    @property() label: string = "";
    @property({ type: Boolean }) hideValue: boolean = false;

    @query("input") private _input: HTMLInputElement;

    static styles = [
        shared,
        css`
            :host {
                display: flex;
                align-items: center;
                padding: 0.5em;
                font-size: inherit;
                --track-color: var(--slider-track-color, --border-color);
                --knob-color: var(--slider-knob-color, var(--color-highlight));
                --track-size: var(--slider-track-size, 0.2em);
                --knob-size: var(--slider-knob-size, 1.3em);
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
                margin-right: 0.5em;
            }

            label:empty {
                display: none;
            }

            .value-display {
                margin-left: 0.5em;
            }

            input[type="range"]::-webkit-slider-runnable-track {
                width: 100%;
                cursor: pointer;
                border-radius: var(--track-size);
                height: var(--track-size);
                background: var(--track-color);
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
        `,
    ];

    render() {
        return html`
            <label>${this.label}</label>

            <input
                type="range"
                .value=${this.value.toString()}
                .min=${this.min.toString()}
                .max=${this.max.toString()}
                .step=${this.step.toString()}
                @input=${() => this._inputChange()}
            />

            <span class="value-display" ?hidden=${this.hideValue}>${this.value}${this.unit}</span>
        `;
    }

    private _inputChange() {
        const prev = this.value;
        this.value = parseFloat(this._input.value);
        this.dispatchEvent(
            new CustomEvent("change", { detail: { prev: prev, value: this.value }, composed: true, bubbles: true })
        );
    }
}
