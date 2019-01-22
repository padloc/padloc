import { randomString, chars } from "@padloc/core/lib/util.js";
import { generatePassphrase } from "@padloc/core/lib/diceware.js";
import { localize as $l } from "@padloc/core/lib/locale.js";
import { shared, mixins } from "../styles";
import { html, property, query, listen, observe } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";
import { Slider } from "./slider.js";
import { ToggleButton } from "./toggle-button.js";
import { Select } from "./select.js";

export type GeneratorMode = "words" | "chars";

interface SeparatorOption {
    value: string;
    toString(): string;
}

const separators = [
    {
        value: "-",
        toString: () => "separate-words-using-hiphens"
    },
    {
        value: "_",
        toString: () => "separate_words_using_underscore"
    },
    {
        value: "/",
        toString: () => "separate/words/using/slashes"
    },
    {
        value: " ",
        toString: () => "separate words using spaces"
    }
];

export class Generator extends Dialog<void, string> {
    @property()
    value: string = "";

    @property()
    mode: GeneratorMode = "words";

    @query("#separator")
    private _separator: Select<SeparatorOption>;
    @query("#wordCount")
    private _wordCount: Slider;

    @query("#lower")
    private _lower: ToggleButton;
    @query("#upper")
    private _upper: ToggleButton;
    @query("#numbers")
    private _numbers: ToggleButton;
    @query("#other")
    private _other: ToggleButton;
    @query("#length")
    private _length: Slider;

    renderContent() {
        const { value } = this;
        return html`
        ${shared}

        <style>
            .inner {
                --color-background: var(--color-tertiary);
                --color-foreground: var(--color-secondary);
                --color-highlight: var(--color-primary);
                background: var(--color-background);
                text-shadow: none;
                border: none;
                overflow: hidden;
                position: relative;
            }

            .charsets {
                display: flex;
            }

            .charsets > * {
                flex: 1;
            }

            .generate-button {
                padding: 25px 15px;
                ${mixins.gradientHighlight()}
                color: var(--color-quaternary);
                text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
            }

            .header {
                font-weight: bold;
                text-align: center;
                margin-bottom: 15px;
            }

            .value {
                font-family: var(--font-family-mono);
                text-align: center;
                font-size: 130%;
                overflow-wrap: break-word;
            }

            pl-toggle-button {
                display: block;
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            pl-slider {
                display: flex;
                height: var(--row-height);
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            pl-select {
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
            }

            .confirm-button {
                font-weight: bold;
                text-align: center;
                width: 100%;
            }

            .close-button {
                position: absolute;
                top: 0;
                right: 0;
                color: var(--color-quaternary);
                text-shadow: rgba(0, 0, 0, 0.2) 0px 2px 0px;
            }

            .tabs {
                border-bottom: solid 1px rgba(0, 0, 0, 0.1);
                display: grid;
                grid-template-columns: 1fr 1fr;
                background: rgba(0, 0, 0, 0.1);
                grid-gap: 1px;
            }

            .tabs > * {
                background: var(--color-tertiary);
            }

            .tabs button[active] {
                color: var(--color-primary);
            }
        </style>

        <div class="generate-button tap" @click=${() => this._generate()}>

            <div class="header">${$l("Generate Password")}</div>

            <div class="value tiles-1">
                ${value}
            </div>

        </div>

        <div class="tabs">

            <button
                class="tap"
                ?active=${this.mode === "words"}
                @click=${() => this._selectMode("words")}>
                ${$l("passphrase")}
            </button>

            <button
                class="tap"
                ?active=${this.mode === "chars"}
                @click=${() => this._selectMode("chars")}>
                ${$l("random string")}
            </button>

        </div>

        <div ?hidden=${this.mode !== "words"}>

            <pl-select id="separator" .options=${separators}></pl-select>

            <pl-slider
                id="wordCount"
                unit=" ${$l("words")}"
                value="4"
                min="3"
                max="6">
            </pl-slider>

        </div>

        <div ?hidden=${this.mode !== "chars"}>

            <pl-toggle-button
                id="lower"
                label="a-z"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="upper"
                label="A-Z"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="numbers"
                label="0-9"
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-toggle-button
                id="other"
                label="?()/%..."
                class="tap"
                reverse>
            </pl-toggle-button>

            <pl-slider
                id="length"
                label="${$l("length")}"
                value="20"
                min="5"
                max="50">
            </pl-slider>

        </div>

        <button class="confirm-button tap" @click=${() => this._confirm()}>${$l("Apply")}</button>

        <pl-icon icon="cancel" class="close-button tap" @click=${() => this._dismiss()}></pl-icon>
`;
    }

    firstUpdated() {
        this._lower.active = this._upper.active = this._numbers.active = true;
    }

    async show(): Promise<string> {
        await this.updateComplete;
        this._generate();
        return super.show();
    }

    @listen("change")
    async _generate() {
        switch (this.mode) {
            case "words":
                this.value = await generatePassphrase(this._wordCount.value, this._separator.selected.value);
                break;
            case "chars":
                let charSet = "";
                this._lower.active && (charSet += chars.lower);
                this._upper.active && (charSet += chars.upper);
                this._numbers.active && (charSet += chars.numbers);
                this._other.active && (charSet += chars.other);
                this.value = charSet ? randomString(this._length.value, charSet) : "";
                break;
        }
    }

    private _confirm() {
        this.done(this.value);
    }

    private _dismiss() {
        this.done("");
    }

    private _selectMode(mode: GeneratorMode) {
        this.mode = mode;
        this._generate();
    }
}

window.customElements.define("pl-generator", Generator);
