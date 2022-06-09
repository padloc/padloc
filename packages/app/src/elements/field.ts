import { Field, FieldType, FIELD_DEFS, AuditResult, AuditType } from "@padloc/core/src/item";
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
import { app } from "../globals";
import { descriptionForAudit, iconForAudit, titleTextForAudit } from "../lib/audit";
import "./popover";

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

    @property({ attribute: false })
    auditResults: AuditResult[] = [];

    @state()
    private _masked: boolean = false;

    @state()
    private _suggestions: string[] | null = null;

    @state()
    private _existingUsernames: string[] = [];

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
            ...(this._fieldDef.actions || []),
            { icon: "copy", label: $l("Copy"), action: () => this.dispatchEvent(new CustomEvent("copy-clipboard")) },
        ];

        if (this._fieldDef.mask && !app.settings.unmaskFieldsOnHover) {
            actions.unshift({
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
        const usernames = new Map<string, number>();
        usernames.set(app.account!.email, 1);
        for (const vault of app.vaults) {
            for (const item of vault.items) {
                for (const field of item.fields) {
                    if (field.type === FieldType.Username && field.value) {
                        usernames.set(field.value, (usernames.get(field.value) || 0) + 1);
                    }
                }
            }
        }
        this._existingUsernames = [...usernames.entries()].sort(([, a], [, b]) => b - a).map(([key]) => key);
    }

    private _editingChanged() {
        if (!this.editing) {
            this.setAttribute("draggable", "true");
        } else {
            this.removeAttribute("draggable");
        }
    }

    protected _mouseenter() {
        if (app.settings.unmaskFieldsOnHover) {
            this._masked = false;
        }
        this._drawer.collapsed = this.editing;
    }

    protected _mouseleave() {
        if (app.settings.unmaskFieldsOnHover) {
            this._masked = true;
        }
        this._drawer.collapsed = true;
    }

    private async _updateSuggestions() {
        switch (this.field.type) {
            case FieldType.Username:
                const value = this._valueInput?.value || "";
                this._suggestions = this._existingUsernames.filter((val) => val.startsWith(value) && val !== value);
                break;
            case FieldType.Password:
                this._suggestions = this._valueInput?.value
                    ? []
                    : [await randomString(16, charSets.alphanum), await generatePassphrase()];
                break;
            case FieldType.Url:
                this._suggestions =
                    !this._valueInput?.value && app.state.context.browser?.url ? [app.state.context.browser.url] : [];
                break;
            default:
                this._suggestions = null;
        }
    }

    private async _expandSuggestions() {
        await this._updateSuggestions();
        const drawer = this._valueInput.querySelector("pl-drawer") as Drawer;
        drawer && (drawer.collapsed = false);
    }

    private _collapseSuggestions() {
        window.setTimeout(() => {
            const drawer = this._valueInput?.querySelector("pl-drawer") as Drawer;
            drawer && (drawer.collapsed = true);
        }, 50);
    }

    static styles = [
        shared,
        css`
            :host {
                display: block;
                position: relative;
                background: var(--color-background);
            }

            :host(.dragging) {
                opacity: 0.999;
            }

            .field-header {
                --input-padding: 0.3em;
                margin: 0.2em 0;
                color: var(--item-view-field-name-color, var(--color-highlight));
                font-weight: var(--item-view-field-name-weight, 400);
            }

            .name-input {
                text-transform: uppercase;
                background: transparent;
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
                margin: 0 0.4em 0.4em 1.5em;
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

            :host(.dragging) pl-drawer {
                display: none;
            }
        `,
    ];

    private _renderDisplayValue() {
        const format = this._fieldDef.format || ((value: string, _masked: boolean) => value);
        if (!this.field.value) {
            return html`<pre class="subtle value-display mono">[${$l("empty")}]</pre>`;
        }
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
                        class="value-input"
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
                        class="value-input mono"
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
                        class="value-input mono"
                        .placeholder=${$l("Enter Password")}
                        type="text"
                        @input=${() => {
                            this.field.value = this._valueInput.value;
                            this._updateSuggestions();
                        }}
                        .value=${this.field.value}
                        @focus=${this._expandSuggestions}
                        @blur=${this._collapseSuggestions}
                        select-on-focus
                    >
                        <pl-button
                            class="small transparent slim"
                            slot="after"
                            @click=${() => this.dispatchEvent(new CustomEvent("generate"))}
                        >
                            <pl-icon icon="generate"></pl-icon>
                        </pl-button>
                        ${this._suggestions
                            ? html`
                                  <pl-drawer slot="below" collapsed>
                                      <div class="scrolling hide-scrollbar">
                                          <div class="horizontal layout">
                                              ${this._suggestions.map(
                                                  (suggestion) => html`
                                                      <pl-button
                                                          class="tiny skinny transparent"
                                                          @click=${() => {
                                                              this._valueInput.value = this.field.value = suggestion;
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
                              `
                            : ""}
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
                        class="value-input"
                        .placeholder=${$l("Enter Value Here")}
                        .type=${inputType}
                        .pattern=${this._fieldDef.pattern.toString()}
                        @input=${() => {
                            this.field.value = this._valueInput.value;
                            this._updateSuggestions();
                        }}
                        .value=${this.field.value}
                        @focus=${this._expandSuggestions}
                        @blur=${this._collapseSuggestions}
                        select-on-focus
                    >
                        ${this._suggestions
                            ? html`
                                  <pl-drawer slot="below" collapsed>
                                      <div class="scrolling hide-scrollbar">
                                          <div class="horizontal layout">
                                              ${this._suggestions.map(
                                                  (suggestion) => html`
                                                      <pl-button
                                                          class="tiny skinny transparent"
                                                          @click=${() => {
                                                              this._valueInput.value = this.field.value = suggestion;
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
                              `
                            : ""}
                    </pl-input>
                `;
        }
    }

    render() {
        return html`
            <div class="horizontal layout">
                <div class="half-margined collapse stretch">
                    <div class="field-header">
                        <pl-input
                            class="transparent tiny name-input"
                            placeholder="${this.editing ? $l("Enter Field Name") : $l("Unnamed")}"
                            .value=${this.field.name}
                            @input=${() => (this.field.name = this._nameInput.value)}
                            ?readonly=${!this.editing}
                        >
                            <div class="spacer" slot="before"></div>
                            <pl-icon icon="${this._fieldDef.icon}" slot="before"></pl-icon>
                            ${Object.values(AuditType).map((type) =>
                                this.auditResults.some((res) => res.type == type)
                                    ? html`
                                          <pl-icon
                                              icon="${iconForAudit(type)}"
                                              slot="after"
                                              class="negative highlighted right-margined"
                                              title=${titleTextForAudit(type)}
                                              style="cursor: help;"
                                          ></pl-icon>
                                          <pl-popover
                                              trigger="hover"
                                              class="double-padded max-width-20em"
                                              style="text-transform: none; color: var(--color-foreground); pointer-events: none;"
                                              slot="after"
                                          >
                                              <div class="large bold">
                                                  <pl-icon icon="${iconForAudit(type)}" class="inline"></pl-icon>
                                                  ${titleTextForAudit(type)}
                                              </div>
                                              <div class="top-margined">${descriptionForAudit(type)}</div>
                                          </pl-popover>
                                      `
                                    : ""
                            )}
                        </pl-input>
                    </div>

                    <div class="field-value">
                        ${this.editing ? this._renderEditValue() : this._renderDisplayValue()}
                    </div>
                </div>

                <div class="left-margined horizontal centering layout" ?hidden=${!this.editing}>
                    <pl-button class="transparent skinny" @click=${() => this.dispatchEvent(new CustomEvent("remove"))}>
                        <pl-icon icon="delete"></pl-icon>
                    </pl-button>

                    <div class="vertical centering layout">
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
                    </div>
                </div>
            </div>

            <pl-drawer class="drawer" collapsed>
                <div class="end-justifying spacing horizontal layout">
                    ${this._fieldActions.map(
                        ({ icon, action, label }) => html`
                            <pl-button
                                class="ghost small slim"
                                @click=${() => action(this.field.value)}
                                style="min-width: 7em"
                            >
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
