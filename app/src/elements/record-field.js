import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import { applyMixins } from "../core/util";
import { isTouch } from "../core/platform";
import "./icon.js";
import "./input.js";
import "./dialog-field.js";
import { NotificationMixin, LocaleMixin, DialogMixin, ClipboardMixin } from "../mixins";

class RecordField extends applyMixins(BaseElement, NotificationMixin, LocaleMixin, DialogMixin, ClipboardMixin) {
    static get template() {
        return html`
        <style include="shared">
            :host {
                display: block;
                color: inherit;
                font-size: var(--font-size-small);
                overflow: hidden;
                position: relative;
            }

            .container {
                display: flex;
                height: 100px;
                position: relative;
                flex-direction: column;
                padding-right: 50px;
            }

            .name {
                font-size: var(--font-size-tiny);
                font-weight: bold;
                color: var(--color-highlight);
                margin: 12px 12px 6px 12px;
            }

            #valueInput {
                font-family: var(--font-family-mono);
                font-size: 130%;
                line-height: 1.2;
                flex: 1;
                margin: 0 12px;
                opacity: 1;
            }

            #valueInput::after {
                content: "";
                display: block;
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 20px;
                background: linear-gradient(rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 100%);
            }

            .field-buttons {
                position: absolute;
                top: 0;
                right: 0;
                z-index: 1;
            }

            .field-button {
                display: block;
                cursor: pointer;
                font-size: 110%;
                width: 50px;
                height: 50px;
            }

            :host(:not(.touch):not(:hover)) .field-buttons {
                visibility: hidden;
            }

            .field-button:hover {
                background: rgba(0, 0, 0, 0.05);
            }
        </style>

        <div class="container tap" on-click="_fieldClicked">
            <div class="name">[[ field.name ]]</div>
            <pl-input multiline="" id="valueInput" value="[[ field.value ]]" disabled="" placeholder="[[ \$l('No Content') ]]" masked="[[ field.masked ]]"></pl-input>
        </div>

        <div class="field-buttons">
            <pl-icon icon="[[ _toggleMaskIcon(field.masked) ]]" class="field-button tap" on-click="_toggleMask" hidden\$="[[ !_hasValue(field.value) ]]"></pl-icon>
            <pl-icon icon="copy" class="field-button tap" on-click="_copy" hidden\$="[[ !_hasValue(field.value) ]]"></pl-icon>
            <pl-icon icon="edit" class="field-button tap" on-click="_edit" hidden\$="[[ _hasValue(field.value) ]]"></pl-icon>
            <pl-icon icon="generate" class="field-button tap" on-click="_showGenerator" hidden\$="[[ _hasValue(field.value) ]]"></pl-icon>
        </div>
`;
    }

    static get is() {
        return "pl-record-field";
    }

    static get properties() {
        return {
            _masked: {
                type: Boolean,
                value: true
            },
            record: Object,
            field: {
                type: Object,
                value: () => {
                    return { name: "", value: "", masked: false };
                }
            }
        };
    }

    connectedCallback() {
        super.connectedCallback();
        this.classList.toggle("touch", isTouch());
    }

    _delete() {
        this.dispatchEvent(new CustomEvent("field-delete", { bubbles: true, composed: true }));
    }

    _showGenerator() {
        return this.generate().then(value => {
            this.set("field.value", value);
            this.dispatchEvent(new CustomEvent("field-change"));
        });
    }

    _copy() {
        this.setClipboard(this.record, this.field);
    }

    _toggleMaskIcon() {
        return this.field.masked ? "show" : "hide";
    }

    _toggleMask() {
        this.set("field.masked", !this.field.masked);
        this.dispatchEvent(new CustomEvent("field-change"));
    }

    _openFieldDialog(edit, presets) {
        this.lineUpDialog("pl-dialog-field", d => d.openField(this.field, edit, presets)).then(result => {
            switch (result.action) {
                case "copy":
                    this._copy();
                    break;
                case "generate":
                    this.generate().then(value => {
                        this._openFieldDialog(true, { name: result.name, value: value || result.value });
                    });
                    break;
                case "delete":
                    this._delete();
                    break;
                case "edited":
                    this.notifyPath("field.name");
                    this.notifyPath("field.value");
                    setTimeout(() => this.dispatchEvent(new CustomEvent("field-change"), 500));
                    break;
            }
        });
    }

    _hasValue() {
        return !!this.field.value;
    }

    _fieldClicked() {
        this._openFieldDialog();
    }

    _edit() {
        this._openFieldDialog(true);
    }
}

window.customElements.define(RecordField.is, RecordField);
