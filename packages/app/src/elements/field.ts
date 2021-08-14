import { Field, FIELD_DEFS } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import { shared } from "../styles";
import "./icon";
import { Input } from "./input";
import { Textarea } from "./textarea";
import "./input";
import "./textarea";
import "./totp";
import "./button";
import { Drawer } from "./drawer";
import { customElement, property, query, state } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { generatePassphrase } from "@padloc/core/src/diceware";
import { randomString, charSets } from "@padloc/core/src/util";

@customElement("pl-field")
export class FieldElement extends LitElement {
    @property({ type: Boolean })
    editing: boolean = false;

    @property({ attribute: false })
    field: Field;

    @property({ type: Boolean })
    canMoveUp: boolean;

    @property({ type: Boolean })
    canMoveDown: boolean;

    @state()
    private _masked: boolean = false;

    @state()
    private _suggestions: string[] = [];

    @query(".name-input")
    private _nameInput: Input;

    @query(".value-input")
    private _valueInput: Input | Textarea;

    @query(".drawer")
    private _drawer: Drawer;

    private get _fieldDef() {
        return FIELD_DEFS[this.field.type] || FIELD_DEFS.text;
    }

    private get _fieldActions() {
        const actions = [
            { icon: "copy", label: $l("Copy"), action: () => this.dispatchEvent(new CustomEvent("copy-clipboard")) },
        ];

        if (this._fieldDef.mask) {
            actions.push({
                icon: this._masked ? "show" : "hide",
                label: this._masked ? "show" : "hide",
                action: () => (this._masked = !this._masked),
            });
        }

        return actions;
    }

    focus() {
        if (this.editing) {
            const inputToFocus = this._nameInput.value ? this._valueInput : this._nameInput;
            inputToFocus.focus();
        } else {
            super.focus();
        }
    }

    updated(changes: Map<string, any>) {
        if (changes.has("field")) {
            this._fieldChanged();
        }

        if (changes.has("editing")) {
            this._editingChanged();
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("mouseenter", () => this._mouseenter());
        this.addEventListener("mouseleave", () => this._mouseleave());
    }

    private _fieldChanged() {
        this._masked = this._fieldDef.mask;
        this._updateSuggestions();
    }

    private _editingChanged() {
        if (!this.editing) {
            this.setAttribute("draggable", "true");
        } else {
            this.removeAttribute("draggable");
        }
    }

    protected _mouseenter() {
        this._drawer.collapsed = this.editing;
    }

    protected _mouseleave() {
        this._drawer.collapsed = true;
    }

    private async _updateSuggestions() {
        switch (this.field.type) {
            case "password":
                this._suggestions = [await randomString(16, charSets.alphanum), await generatePassphrase()];
                break;
            default:
                this._suggestions = [];
        }
    }

    private _collapseSuggestionsTimeout: number;

    private _expandSuggestions() {
        console.log("focusin");
        window.clearTimeout(this._collapseSuggestionsTimeout);
        this._collapseSuggestionsTimeout = window.setTimeout(async () => {
            // await this._updateSuggestions();
            const drawer = this._valueInput.querySelector("pl-drawer") as Drawer;
            drawer && (drawer.collapsed = false);
        }, 100);
    }

    private _collapseSuggestions() {
        console.log("focusout");
        window.clearTimeout(this._collapseSuggestionsTimeout);
        this._collapseSuggestionsTimeout = window.setTimeout(() => {
            const drawer = this._valueInput.querySelector("pl-drawer") as Drawer;
            drawer && (drawer.collapsed = true);
        }, 100);
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                opacity: 0.999;
                position: relative;
                background: var(--color-background);
            }

            .field-header {
                color: var(--color-highlight);
                --input-padding: 0.3em;
                margin: 0.2em 0;
                font-weight: 600;
            }

            .value-input,
            .value-display {
                line-height: 1.4em;
            }

            .value-input {
                --input-padding: 0.3em 0.8em 0.3em 0.4em;
                margin-bottom: 0.3em;
            }

            .value-display {
                margin: -0.2em 0.4em 0.4em 0.4em;
                white-space: pre-wrap;
                overflow-wrap: break-word;
                user-select: text;
                cursor: text;
            }

            .move-button {
                display: flex;
                --button-padding: 0 0.5em;
            }

            :host([draggable]),
            :host([draggable]) .name-input {
                cursor: grab;
            }

            :host([draggable]):active {
                cursor: grabbing;
            }

            .actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(5em, 1fr));
            }

            :host(.dragging) pl-drawer {
                display: none;
            }
        `,
    ];

    private _renderDisplayValue() {
        const format = this._fieldDef.format || ((value: string, _masked: boolean) => value);
        switch (this.field.type) {
            case "password":
            case "pin":
                return html` <pre class="value-display mono">${format(this.field.value, this._masked)}</pre> `;
            case "totp":
                return html` <pl-totp class="mono value-display" .secret=${this.field.value}></pl-totp> `;
            default:
                return html` <pre class="value-display">${format(this.field.value, this._masked)}</pre> `;
        }
    }

    private _renderEditValue() {
        switch (this.field.type) {
            case "note":
                return html`
                    <pl-textarea
                        class="dashed value-input"
                        .placeholder=${$l("Enter Notes Here")}
                        @input=${() => (this.field.value = this._valueInput.value)}
                        autosize
                        .value=${this.field.value}
                    >
                    </pl-textarea>
                `;

            case "totp":
                return html`
                    <pl-input
                        class="dashed value-input mono"
                        .placeholder=${$l("Enter Secret")}
                        type="text"
                        @input=${() => (this.field.value = this._valueInput.value)}
                        .value=${this.field.value}
                    >
                        <pl-button
                            class="small transparent slim"
                            slot="after"
                            @click=${() => this.dispatchEvent(new CustomEvent("get-totp-qr"))}
                        >
                            <pl-icon icon="qrcode"></pl-icon>
                        </pl-button>
                    </pl-input>
                `;
            case "password":
                return html`
                    <pl-input
                        class="dashed value-input mono"
                        .placeholder=${$l("Enter Password")}
                        type="text"
                        @input=${() => (this.field.value = this._valueInput.value)}
                        .value=${this.field.value}
                        @focusin=${this._expandSuggestions}
                        @focusout=${this._collapseSuggestions}
                    >
                        <pl-button
                            class="small transparent slim"
                            slot="after"
                            @click=${() => this.dispatchEvent(new CustomEvent("generate"))}
                        >
                            <pl-icon icon="generate"></pl-icon>
                        </pl-button>
                        <pl-drawer slot="below" collapsed>
                            <div class="scrolling">
                                <div class="horizontal layout">
                                    ${this._suggestions.map(
                                        (suggestion) => html`
                                            <pl-button
                                                class="tiny skinny transparent"
                                                @click=${() => {
                                                    this._valueInput.value = suggestion;
                                                    this._collapseSuggestions();
                                                }}
                                            >
                                                <pl-icon icon="suggestion" class="right-margined"></pl-icon>
                                                ${suggestion}
                                            </pl-button>
                                        `
                                    )}
                                </div>
                            </div>
                        </pl-drawer>
                    </pl-input>
                `;

            default:
                let inputType: string;
                switch (this.field.type) {
                    case "email":
                    case "url":
                    case "date":
                    case "month":
                        inputType = this.field.type;
                        break;
                    case "pin":
                    case "credit":
                        inputType = "number";
                        break;
                    case "phone":
                        inputType = "tel";
                        break;
                    default:
                        inputType = "text";
                }
                return html`
                    <pl-input
                        class="dashed value-input"
                        .placeholder=${$l("Enter Value Here")}
                        .type=${inputType}
                        .pattern=${this._fieldDef.pattern}
                        @input=${() => (this.field.value = this._valueInput.value)}
                        .value=${this.field.value}
                    >
                    </pl-input>
                `;
        }
    }

    render() {
        return html`
            <div class="horizontal layout">
                <div class="vertical centering layout" ?hidden=${!this.editing}>
                    <pl-button
                        class="transparent move-button"
                        @click=${() => this.dispatchEvent(new CustomEvent("moveup"))}
                        ?disabled=${!this.canMoveUp}
                    >
                        <pl-icon icon="dropup"></pl-icon>
                    </pl-button>

                    <pl-button
                        class="transparent move-button"
                        @click=${() => this.dispatchEvent(new CustomEvent("movedown"))}
                        ?disabled=${!this.canMoveDown}
                    >
                        <pl-icon icon="dropdown"></pl-icon>
                    </pl-button>

                    <pl-button class="transparent slim" @click=${() => this.dispatchEvent(new CustomEvent("remove"))}>
                        <pl-icon icon="remove"></pl-icon>
                    </pl-button>
                </div>

                <div class="half-margined collapse stretch">
                    <div class="field-header">
                        <pl-input
                            class="dashed transparent small name-input"
                            placeholder="${this.editing ? $l("Enter Field Name") : $l("Unnamed")}"
                            .value=${this.field.name}
                            @input=${() => (this.field.name = this._nameInput.value)}
                            ?readonly=${!this.editing}
                        >
                            <div class="spacer" slot="before"></div>
                            <pl-icon icon="${this._fieldDef.icon}" class="tiny" slot="before"></pl-icon>
                        </pl-input>
                    </div>

                    <div class="field-value">
                        ${this.editing ? this._renderEditValue() : this._renderDisplayValue()}
                    </div>
                </div>
            </div>

            <pl-drawer class="drawer" collapsed>
                <div class="actions">
                    ${this._fieldActions.map(
                        ({ icon, action, label }) => html`
                            <pl-button class="transparent slim" @click=${action}>
                                <pl-icon icon=${icon} class="right-margined"></pl-icon>
                                <div>${label}</div>
                            </pl-button>
                        `
                    )}
                </div>
            </pl-drawer>
        `;
    }
}
