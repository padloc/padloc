import { randomString, chars } from "@padloc/core/src/util";
import { generatePassphrase, AVAILABLE_LANGUAGES } from "@padloc/core/src/diceware";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { html, css, property, query, listen } from "./base";
import { Dialog } from "./dialog";
import { Slider } from "./slider";
import { ToggleButton } from "./toggle-button";
import { Select } from "./select";
import "./icon";

export type GeneratorMode = "words" | "chars";

interface SeparatorOption {
    value: string;
    toString(): string;
}

const separators = [
    {
        value: "-",
        toString: () => $l("Dash") + " ( - )"
    },
    {
        value: "_",
        toString: () => $l("Underscore") + " ( _ )"
    },
    {
        value: "/",
        toString: () => $l("Slash") + " ( / )"
    },
    {
        value: " ",
        toString: () => $l("Space") + " (   )"
    }
];

export class Generator extends Dialog<void, string> {
    @property()
    value: string = "";

    @property()
    mode: GeneratorMode = "words";

    @query("#separator")
    private _separator: Select<SeparatorOption>;
    @query("#language")
    private _language: Select<{ value: string }>;
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

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                background: var(--color-quaternary);
                display: flex;
                flex-direction: column;
            }

            .header {
                background: var(--color-tertiary);
                text-align: center;
                font-weight: bold;
            }

            .header-title {
                font-size: 120%;
                padding: 20px 20px 10px 20px;
            }

            .charsets {
                display: flex;
            }

            .charsets > * {
                flex: 1;
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
                text-align: center;
            }

            .controls > * {
                margin: 16px 8px;
            }

            .result {
                font-family: var(--font-family-mono);
                text-align: center;
                font-size: 120%;
                overflow-wrap: break-word;
                font-weight: bold;
                padding: 20px;
                margin: 16px 8px;
            }

            .arrow {
                display: block;
                margin: -10px auto;
                font-size: 120%;
            }
        `
    ];

    renderContent() {
        const { value } = this;
        return html`
            <div class="header">
                <div class="header-title">${$l("Generate Password")}</div>
                <div class="tabs">
                    <div
                        class="flex tab tap"
                        ?active=${this.mode === "words"}
                        @click=${() => this._selectMode("words")}
                    >
                        ${$l("passphrase")}
                    </div>
                    <div
                        class="flex tab tap"
                        ?active=${this.mode === "chars"}
                        @click=${() => this._selectMode("chars")}
                    >
                        ${$l("random string")}
                    </div>
                </div>
            </div>

            <div class="content">
                <div ?hidden=${this.mode !== "words"} class="controls">
                    <pl-select
                        id="separator"
                        .options=${separators}
                        .label=${$l("Word Separator")}
                        class="item tap"
                    ></pl-select>

                    <pl-select
                        id="language"
                        .options=${AVAILABLE_LANGUAGES}
                        .label=${$l("Language")}
                        class="item tap"
                    ></pl-select>

                    <pl-slider
                        id="wordCount"
                        unit=" ${$l("words")}"
                        value="4"
                        min="3"
                        max="6"
                        class="item tap"
                    ></pl-slider>
                </div>

                <div ?hidden=${this.mode !== "chars"} class="controls">
                    <pl-toggle-button id="lower" label="a-z" class="item tap" reverse></pl-toggle-button>

                    <pl-toggle-button id="upper" label="A-Z" class="item tap" reverse></pl-toggle-button>

                    <pl-toggle-button id="numbers" label="0-9" class="item tap" reverse></pl-toggle-button>

                    <pl-toggle-button id="other" label="?()/%..." class="item tap" reverse></pl-toggle-button>

                    <pl-slider id="length" label="${$l("length")}" value="20" min="5" max="50" class="item"></pl-slider>
                </div>

                <pl-icon icon="arrow-down" class="arrow"></pl-icon>

                <div class="result item tap" @click=${() => this._generate()}>
                    ${value}
                </div>

                <div class="actions">
                    <button class="primary tap" @click=${() => this._confirm()}>${$l("Use")}</button>
                    <button class="tap" @click=${() => this.dismiss()}>${$l("Discard")}</button>
                </div>
            </div>
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
        const separator = (this._separator && this._separator.selected && this._separator.selected.value) || "-";
        const language =
            (this._language && this._language.selected && this._language.selected.value) || app.state.device.locale;

        switch (this.mode) {
            case "words":
                this.value = await generatePassphrase(this._wordCount.value, separator, [language]);
                break;
            case "chars":
                let charSet = "";
                this._lower.active && (charSet += chars.lower);
                this._upper.active && (charSet += chars.upper);
                this._numbers.active && (charSet += chars.numbers);
                this._other.active && (charSet += chars.other);
                this.value = charSet ? await randomString(this._length.value, charSet) : "";
                break;
        }
    }

    private _confirm() {
        this.done(this.value);
    }

    private _selectMode(mode: GeneratorMode) {
        this.mode = mode;
        this._generate();
    }
}

window.customElements.define("pl-generator", Generator);
