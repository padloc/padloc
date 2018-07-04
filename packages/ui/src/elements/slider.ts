import { LitElement, html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared.js";

class Slider extends LitElement {
    static get properties() {
        return {
            min: Number,
            max: Number,
            value: Number,
            unit: String,
            step: Number,
            label: String,
            hideValue: Boolean
        };
    }

    constructor() {
        super();
        this.min = 1;
        this.max = 10;
        this.value = this.min;
        this.unit = "";
        this.step = 1;
        this.label = "";
        this.hideValue = false;
    }

    _render(props: any) {
        return html`
        <style include="shared">
            ${sharedStyles}

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

            input[type=range] {
                -webkit-appearance: none;
                width: 100%;
                margin: 0;
                padding: 0;
                flex: 1;
                height: auto;
                min-height: var(--knob-size);
            }

            input[type=range]:focus {
                outline: none;
            }

            input[type=range]::-webkit-slider-runnable-track {
                width: 100%;
                height: var(--track-size);
                cursor: pointer;
                background: var(--track-color);
                border-radius: 100%;
            }

            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
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

            input[type=range]:active::-webkit-slider-thumb {
                transform: scale(1.1);
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

        </style>

        <label>${props.label}</label>

        <input
            type="range"
            value="${props.value}"
            min="${props.min}"
            max="${props.max}"
            step="${props.step}"
            on-input="${() => this._inputChange()}">

        <span class="value-display" hidden?="${props.hideValue}">${props.value}${props.unit}</span>
`;
    }

    _strValueChanged() {
        this.value = parseFloat(this._strValue);
    }

    _valueChanged() {
        this._strValue = this.value.toString();
    }

    _inputChange() {
        this.value = parseFloat(this.shadowRoot.querySelector("input").value);
        this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
    }
}

window.customElements.define("pl-slider", Slider);
