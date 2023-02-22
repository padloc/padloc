import { $l } from "@padloc/locale/src/translate";
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { shared } from "../styles";

export const defaultColors = [
    "#fc5c65",
    "#fd9644",
    "#fed330",
    "#26de81",
    "#2bcbba",
    "#eb3b5a",
    "#fa8231",
    "#f7b731",
    "#20bf6b",
    "#0fb9b1",
    "#45aaf2",
    "#4b7bec",
    "#a55eea",
    "#a5b1c2",
    "#778ca3",
    "#2d98da",
    "#3867d6",
    "#8854d0",
    "#4b6584",
];

@customElement("pl-color-picker")
export class ColorPicker extends LitElement {
    @property()
    value: string;

    private _selectColor(value: string) {
        this.value = value;
        this.dispatchEvent(new CustomEvent("change", { detail: { value }, bubbles: true, composed: true }));
    }

    static styles = [
        shared,
        css`
            .color-grid {
                display: grid;
                grid-template-columns: repeat(5, 2em);
                border-radius: 0.5em;
                overflow: hidden;
            }

            .color-cell {
                width: 2em;
                height: 2em;
                background: var(
                    --color-highlight,
                    linear-gradient(to top right, white 0%, white 47%, black 48%, black 52%, white 53%, white 100%)
                );
            }

            input {
                width: 100%;
                height: 100%;
                position: absolute;
                padding: 0;
                margin: 0;
                top: 0;
                left: 0;
                opacity: 0;
                cursor: pointer;
                box-sizing: border-box;
            }

            .more-button {
                border-radius: 0.5em;
                border: solid 1px var(--shade-2);
            }
        `,
    ];

    render() {
        return html`
            <div class="color-grid">
                ${[...defaultColors, ""].map(
                    (color) =>
                        html`
                            <div
                                class="color-cell click"
                                style="--color-highlight: ${color || "initial"};"
                                @click=${() => this._selectColor(color)}
                            ></div>
                        `
                )}
            </div>
            <div class="small relative text-centering padded top-margined more-button hover click">
                ${$l("More")}...
                <input type="color" @change=${(e: Event) => this._selectColor((e.target as HTMLInputElement).value)} />
            </div>
        `;
    }
}
