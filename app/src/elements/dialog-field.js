import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import "./dialog.js";
import "./icon.js";
import { LocaleMixin } from "../mixins";

class RecordFieldDialog extends LocaleMixin(BaseElement) {
    static get template() {
        return html`
        <style include="shared">
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

        <pl-dialog open="{{ open }}" prevent-dismiss="[[ editing ]]" on-dialog-dismiss="_close">
            <div class="header">
                <pl-input id="nameInput" placeholder="[[ \$l('Enter Field Name') ]]" class="name" readonly="[[ !editing ]]" on-click="_inputClicked" on-enter="_nameInputEnter"></pl-input>
                <pl-icon icon="cancel" class="tap" on-click="_close" hidden\$="[[ editing ]]"></pl-icon>
            </div>
            <div class="value-wrapper">
                <pl-input id="valueInput" multiline="" class="value" autosize="" on-click="_inputClicked" placeholder="[[ \$l('Enter Content') ]]" readonly="[[ !editing ]]"></pl-input>
                <button class="generate-button tap" on-click="_generate" hidden\$="[[ !editing ]]">
                    <div>[[ \$l("Generate") ]]</div>
                    <pl-icon icon="generate"></pl-icon>
                </button>
            </div>
            <div class="actions">
                <div class="action-items tiles-3 tiles" hidden\$="[[ editing ]]">
                    <pl-icon icon="copy" class="tap" on-click="_copy"></pl-icon>
                    <pl-icon icon="edit" class="tap" on-click="_edit"></pl-icon>
                    <pl-icon icon="generate" class="tap" on-click="_generate"></pl-icon>
                    <pl-icon icon="delete" class="tap" on-click="_delete"></pl-icon>
                </div>
                <div class="action-items" hidden\$="[[ !editing ]]">
                    <button class="tap" on-click="_discardChanges">[[ \$l("Discard") ]]</button>
                    <button class="tap" on-click="_saveChanges">[[ \$l("Save") ]]</button>
                </div>
            </div>
        </pl-dialog>
`;
    }

    static get is() {
        return "pl-dialog-field";
    }

    static get properties() {
        return {
            editing: {
                type: Boolean,
                value: false,
                reflectToAttribute: true
            },
            field: {
                type: Object,
                value: () => {
                    return { name: "", value: "" };
                }
            },
            open: {
                type: Boolean,
                value: false
            }
        };
    }

    openField(field, edit = false, presets = {}) {
        this.open = true;
        this.editing = false;
        this.field = field;
        this.$.nameInput.value = presets.name || this.field.name;
        this.$.valueInput.value = presets.value || this.field.value;
        if (edit) {
            this._edit();
        }
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    _closeWithAction(action) {
        this.open = false;
        this._resolve &&
            this._resolve({
                action: action,
                name: this.$.nameInput.value,
                value: this.$.valueInput.value
            });
        this._resolve = null;
    }

    _close() {
        this._closeWithAction();
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
            if (!this.$.nameInput.value) {
                this.$.nameInput.focus();
            } else {
                this.$.valueInput.focus();
            }
        }, 100);
    }

    _discardChanges() {
        this.$.nameInput.value = this.field.name;
        this.$.valueInput.value = this.field.value;
        this._close();
    }

    _saveChanges() {
        this.field.name = this.$.nameInput.value;
        this.field.value = this.$.valueInput.value;
        this._closeWithAction("edited");
    }

    _inputClicked(e) {
        if (!e.target.value) {
            this.editing = true;
        }
    }

    _nameInputEnter() {
        this.$.valueInput.focus();
    }
}

window.customElements.define(RecordFieldDialog.is, RecordFieldDialog);
