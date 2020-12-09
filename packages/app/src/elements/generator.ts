import { randomString, chars } from "@padloc/core/src/util";
import { generatePassphrase, AVAILABLE_LANGUAGES } from "@padloc/core/src/diceware";
import { translate as $l } from "@padloc/locale/src/translate";
import { animateElement } from "../lib/animation";
import { app } from "../globals";
import { html, css, property, query, listen } from "./base";
import { Dialog } from "./dialog";
import { Slider } from "./slider";
import { ToggleButton } from "./toggle-button";
import { Select } from "./select";
import "./icon";
import "./button";

export type GeneratorMode = "words" | "chars";

interface SeparatorOption {
    value: string;
    toString(): string;
}

const separators = [
    {
        value: "-",
        toString: () => $l("Dash") + " ( - )",
    },
    {
        value: "_",
        toString: () => $l("Underscore") + " ( _ )",
    },
    {
        value: "/",
        toString: () => $l("Slash") + " ( / )",
    },
    {
        value: " ",
        toString: () => $l("Space") + " (   )",
    },
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

    @query(".result")
    private _result: HTMLDivElement;

    static styles = [
        ...Dialog.styles,
        css`
            .result {
                font-family: var(--font-family-mono);
                text-align: center;
                font-size: 120%;
                overflow-wrap: break-word;
                font-weight: bold;
                padding: 20px;
                margin: var(--gutter-size);
                cursor: pointer;
            }

            .result > .hint {
                margin: 8px 0 -12px 0;
                font-size: var(--font-size-micro);
                color: var(--color-shade-3);
            }
        `,
    ];

    renderContent() {
        const { value } = this;
        return html`
            <div class="padded header">
                <div class="large text-centering padded">${$l("Generate Password")}</div>
                <div class="horizontal evenly spacing stretching layout">
                    <pl-button .toggled=${this.mode === "words"} @click=${() => this._selectMode("words")}>
                        ${$l("passphrase")}
                    </pl-button>
                    <pl-button .toggled=${this.mode === "chars"} @click=${() => this._selectMode("chars")}>
                        ${$l("random string")}
                    </pl-button>
                </div>
            </div>

            <div class="stretch padded">
                <div ?hidden=${this.mode !== "words"} class="spacing vertical layout">
                    <pl-select id="separator" .options=${separators} .label=${$l("Word Separator")}></pl-select>

                    <pl-select id="language" .options=${AVAILABLE_LANGUAGES} .label=${$l("Language")}></pl-select>

                    <pl-slider id="wordCount" unit=" ${$l("words")}" value="4" min="3" max="6"></pl-slider>
                </div>

                <div ?hidden=${this.mode !== "chars"} class="vertical spacing layout">
                    <pl-toggle-button id="lower" label="a-z" reverse></pl-toggle-button>

                    <pl-toggle-button id="upper" label="A-Z" reverse></pl-toggle-button>

                    <pl-toggle-button id="numbers" label="0-9" reverse></pl-toggle-button>

                    <pl-toggle-button id="other" label="?()/%..." reverse></pl-toggle-button>

                    <pl-slider id="length" label="${$l("length")}" value="20" min="5" max="50" class="item"></pl-slider>
                </div>

                <div class="centering layout">
                    <pl-icon icon="arrow-down" class="large"></pl-icon>
                </div>

                <div class="result" @click=${() => this._generate()}>
                    <div>${value}</div>

                    <div class="tiny padded subtle">${$l("Click To Shuffle")}</div>
                </div>
            </div>

            <footer class="padded horizontal evenly stretching spacing layout">
                <pl-button class="primary" @click=${() => this._confirm()}>${$l("Use")}</pl-button>
                <pl-button @click=${() => this.dismiss()}>${$l("Discard")}</pl-button>
            </footer>
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

        animateElement(this._result, { animation: "bounce" });
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
