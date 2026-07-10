import { AVAILABLE_LANGUAGES, generatePassphrase } from "@padloc/core/src/diceware";
import { chars, randomString } from "@padloc/core/src/util";
import { translate as $l } from "@padloc/locale/src/translate";
import { app } from "../globals";
import { animateElement } from "../lib/animation";
import type { Select } from "./select";
import type { Slider } from "./slider";
import type { ToggleButton } from "./toggle-button";
import "./slider";
import "./toggle-button";
import "./select";
import "./icon";
import "./button";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";

export type GeneratorMode = "words" | "chars";

import "./scroller";
import { setClipboard } from "../lib/clipboard";
import { shared } from "../styles";

const separators = [
    {
        value: "-",
        label: () => $l("Dash") + " ( - )",
    },
    {
        value: "_",
        label: () => $l("Underscore") + " ( _ )",
    },
    {
        value: "/",
        label: () => $l("Slash") + " ( / )",
    },
    {
        value: " ",
        label: () => $l("Space") + " (   )",
    },
];

@customElement("pl-generator")
export class Generator extends LitElement {
    @property()
    value: string = "";

    @property()
    mode: GeneratorMode = "words";

    @query("#separator")
    private _separator: Select<string>;

    @query("#language")
    private _language: Select<string>;

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
        shared,
        css`
            :host {
                display: block;
            }

            .result {
                font-family: var(--font-family-mono);
                text-align: center;
                font-size: 120%;
                overflow-wrap: break-word;
                padding: 1.5em;
            }
        `,
    ];

    render() {
        const { value } = this;
        return html`
            <div class="padded header">
                <div class="horizontal evenly spacing stretching layout">
                    <pl-button
                        class="slim ghost"
                        .toggled=${this.mode === "words"}
                        @click=${() => this._selectMode("words")}
                    >
                        ${$l("passphrase")}
                    </pl-button>
                    <pl-button
                        class="slim ghost"
                        .toggled=${this.mode === "chars"}
                        @click=${() => this._selectMode("chars")}
                    >
                        ${$l("random string")}
                    </pl-button>
                </div>
            </div>

            <div class="padded">
                <div ?hidden=${this.mode !== "words"} class="spacing vertical layout">
                    <pl-select id="separator" .options=${separators} .label=${$l("Word Separator")}></pl-select>

                    <pl-select id="language" .options=${AVAILABLE_LANGUAGES} .label=${$l("Language")}></pl-select>

                    <pl-slider id="wordCount" unit=" ${$l("words")}" value="4" min="3" max="12"></pl-slider>
                </div>

                <div ?hidden=${this.mode !== "chars"} class="vertical spacing layout">
                    <pl-toggle-button id="lower" label="a-z" reverse></pl-toggle-button>

                    <pl-toggle-button id="upper" label="A-Z" reverse></pl-toggle-button>

                    <pl-toggle-button id="numbers" label="0-9" reverse></pl-toggle-button>

                    <pl-toggle-button id="other" label="?()/%..." reverse></pl-toggle-button>

                    <pl-slider
                        id="length"
                        label="${$l("length")}"
                        value="20"
                        min="5"
                        max="150"
                        class="item"
                    ></pl-slider>
                </div>

                <div class="centering layout">
                    <pl-icon icon="arrow-down" class="large"></pl-icon>
                </div>

                <div class="result">
                    <div>${value}</div>
                </div>

                <div class="horizontal centering spacing layout">
                    <pl-button class="slim ghost" @click=${() => this.generate()}>
                        <div>
                            <pl-icon class="inline" icon="refresh"></pl-icon>
                            Regenerate
                        </div>
                    </pl-button>
                    <pl-button class="slim ghost" @click=${() => setClipboard(value)}>
                        <div>
                            <pl-icon class="inline" icon="copy"></pl-icon>
                            Copy
                        </div>
                    </pl-button>
                </div>
            </div>
        `;
    }

    firstUpdated() {
        this._lower.active = this._upper.active = this._numbers.active = true;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("change", () => this.generate());
    }

    async generate() {
        const separator = this._separator?.value || "-";
        const language = this._language?.value || app.state.device.locale;

        switch (this.mode) {
            case "words":
                this.value = await generatePassphrase(this._wordCount.value, separator, [language]);
                break;
            case "chars": {
                let charSet = "";
                this._lower.active && (charSet += chars.lower);
                this._upper.active && (charSet += chars.upper);
                this._numbers.active && (charSet += chars.numbers);
                this._other.active && (charSet += chars.other);
                this.value = charSet ? await randomString(this._length.value, charSet) : "";
                break;
            }
        }

        animateElement(this._result, { animation: "bounce" });
    }

    private _selectMode(mode: GeneratorMode) {
        this.mode = mode;
        this.generate();
    }
}
