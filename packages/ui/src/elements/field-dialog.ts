import { localize as $l } from "@padlock/core/lib/locale.js";
import { Field } from "@padlock/core/lib/data.js";
import sharedStyles from "../styles/shared.js";
import { BaseElement, element, html, property, query } from "./base.js";
import { Input } from "./input.js";
import "./dialog.js";
import "./icon.js";

export type FieldDialogAction = "edit" | "delete" | "generate" | "copy" | "dismiss";

export interface FieldDialogResult {
    action: FieldDialogAction;
    name: string;
    value: string;
}

@element("pl-field-dialog")
export class FieldDialog extends BaseElement {
    @property({ reflect: true })
    editing: boolean = false;
    @property() field: Field | null = null;
    @property() open: boolean = false;

    @query("#nameInput") private _nameInput: Input;
    @query("#valueInput") private _valueInput: Input;

    private _resolve: ((_: FieldDialogResult) => void) | null;

    _render(props: this) {
        return html`
        <style>
            ${sharedStyles}

            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                    transition: background 0.3s, color 0.3s;
                };
            }

            :host([editing]) {
                --pl-dialog-inner: {
                    transition: background 0.3s, color 0.3s;
                    background: var(--color-tertiary);
                    color: var(--color-secondary);
                    text-shadow: none;
                };
            }

            :host([editing]) .header {
                border-bottom: solid 1px;;
            }

            :host([editing]) .actions {
                border-top: dashed 1px;;
            }

            .header {
                display: flex;
            }

            .name {
                flex: 1;
                font-weight: bold;
                padding: 0 20px;
            }

            .header > pl-icon {
                height: var(--row-height);
                width: var(--row-height);
            }

            .value {
                font-family: var(--font-family-mono);
                word-break: break-all;
                font-size: 130%;
                padding: 20px;
                line-height: 120%;
                background: var(--shade-2-color);
                transition: background 0.3s;
            }

            :host([editing]) .value {
                background: transparent;
            }

            .action-items {
                display: flex;
            }

            .action-items > * {
                height: var(--row-height);
                flex: 1;
            }

            .value-wrapper {
                position: relative;
            }

            button.generate-button {
                font-size: var(--font-size-tiny);
                height: 35px;
                line-height: normal;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                position: absolute;
                bottom: 0;
                right: 0;
                z-index: 1;
                padding: 0 6px 0 12px;
                width: auto;
            }

            .generate-button pl-icon {
                width: 20px;
                height: 20px;
            }
        </style>

        <pl-dialog open="${props.open}" prevent-dismiss="${props.editing}" on-dialog-dismiss="${() => this._dismiss()}">

            <div class="header">

                <pl-input
                    id="nameInput"
                    placeholder="${$l("Enter Field Name")}"
                    class="name"
                    readonly="${!props.editing}"
                    on-click="${(e: MouseEvent) => this._inputClicked(e)}"
                    on-enter="${() => this._nameInputEnter()}">
                </pl-input>

                <pl-icon
                    icon="cancel"
                    class="tap"
                    on-click="${() => this._dismiss()}"
                    hidden?="${props.editing}">
                </pl-icon>

            </div>

            <div class="value-wrapper">

                <pl-input
                    id="valueInput"
                    multiline
                    class="value"
                    autosize
                    on-click="${(e: MouseEvent) => this._inputClicked(e)}"
                    placeholder="${$l("Enter Content")}"
                    readonly="${!props.editing}">
                </pl-input>

                <button class="generate-button tap" on-click="${() => this._generate()}" hidden?="${!props.editing}">

                    <div>${$l("Generate")}</div>

                    <pl-icon icon="generate"></pl-icon>

                </button>

            </div>

            <div class="actions">

                <div class="action-items tiles-3 tiles" hidden?="${props.editing}">

                    <pl-icon icon="copy" class="tap" on-click="${() => this._copy()}"></pl-icon>

                    <pl-icon icon="edit" class="tap" on-click="${() => this._edit()}"></pl-icon>

                    <pl-icon icon="generate" class="tap" on-click="${() => this._generate()}"></pl-icon>

                    <pl-icon icon="delete" class="tap" on-click="${() => this._delete()}"></pl-icon>

                </div>

                <div class="action-items" hidden?="${!props.editing}">

                    <button class="tap" on-click="${() => this._discardChanges()}">${$l("Discard")}</button>

                    <button class="tap" on-click="${() => this._saveChanges()}">${$l("Save")}</button>

                </div>

            </div>

        </pl-dialog>
`;
    }

    openField(field: Field, edit = false, presets: { name?: string; value?: string } = {}): Promise<FieldDialogResult> {
        this.open = true;
        this.editing = false;
        this.field = field;
        this._nameInput.value = presets.name || this.field.name;
        this._valueInput.value = presets.value || this.field.value;
        if (edit) {
            this._edit();
        }
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    _closeWithAction(action: FieldDialogAction) {
        this.open = false;
        this._resolve &&
            this._resolve({
                action: action,
                name: this._nameInput.value,
                value: this._valueInput.value
            });
        this._resolve = null;
    }

    _dismiss() {
        this._closeWithAction("dismiss");
    }

    _delete() {
        this._closeWithAction("delete");
    }

    _copy() {
        this._closeWithAction("copy");
    }

    _generate() {
        this._closeWithAction("generate");
    }

    _edit() {
        this.editing = true;
        setTimeout(() => {
            if (!this._nameInput.value) {
                this._nameInput.focus();
            } else {
                this._valueInput.focus();
            }
        }, 100);
    }

    _discardChanges() {
        this._nameInput.value = (this.field && this.field.name) || "";
        this._valueInput.value = (this.field && this.field.value) || "";
        this._dismiss();
    }

    _saveChanges() {
        this._closeWithAction("edit");
    }

    _inputClicked(e: any) {
        if (!e.target.value) {
            this.editing = true;
        }
    }

    _nameInputEnter() {
        this._valueInput.focus();
    }
}
