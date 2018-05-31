import "../styles/shared.js";
import { localize } from "../core/locale.js";
import { BaseElement, html } from "./base.js";
import "./input.js";
import "./loading-button.js";
import "./dialog.js";

const defaultConfirmLabel = localize("OK");
const defaultCancelLabel = localize("Cancel");
const defaultType = "text";
const defaultPlaceholder = "";

class DialogPrompt extends BaseElement {
    static get template() {
        return html`
        <style include="shared">
            :host {
                --pl-dialog-inner: {
                    background: linear-gradient(rgb(89, 198, 255) 0%, rgb(7, 124, 185) 100%);
                };
            }

            pl-input {
                text-align: center;
            }

            .validation-message {
                position: relative;
                margin-top: 15px;
                font-weight: bold;
                font-size: var(--font-size-small);
                color: var(--color-error);
                text-shadow: none;
                text-align: center;
            }
        </style>

        <pl-dialog id="dialog" open="{{ open }}" prevent-dismiss="[[ preventDismiss ]]" on-dialog-dismiss="_dismiss">
            <div class="message tiles-1" hidden\$="[[ !_hasMessage(message) ]]">[[ message ]]</div>
            <pl-input class="tiles-2" id="input" type="[[ type ]]" placeholder="[[ placeholder ]]" on-enter="_confirm"></pl-input>
            <pl-loading-button id="confirmButton" class="tap tiles-3" on-click="_confirm">[[ confirmLabel ]]</pl-loading-button>
            <button class="tap tiles-4" on-click="_dismiss" hidden\$="[[ _hideCancelButton ]]">[[ cancelLabel ]]</button>
            <div class="validation-message" slot="after">[[ _validationMessage ]]</div>
        </pl-dialog>
`;
    }

    static get is() {
        return "pl-dialog-prompt";
    }

    static get properties() {
        return {
            confirmLabel: { type: String, value: defaultConfirmLabel },
            cancelLabel: { type: String, value: defaultCancelLabel },
            message: { type: String, value: "" },
            open: { type: Boolean, value: false },
            placeholder: { type: String, value: "" },
            preventDismiss: { type: Boolean, value: true },
            type: { type: String, value: defaultType },
            validationFn: Function,
            _validationMessage: { type: String, value: "" }
        };
    }

    _confirm() {
        this.$.confirmButton.start();
        const val = this.$.input.value;
        const p = typeof this.validationFn === "function" ? this.validationFn(val) : Promise.resolve(val);
        p.then(v => {
            this._validationMessage = "";
            this.$.confirmButton.success();
            typeof this._resolve === "function" && this._resolve(v);
            this._resolve = null;
            this.open = false;
        }).catch(e => {
            this.$.dialog.rumble();
            this._validationMessage = e;
            this.$.confirmButton.fail();
        });
    }

    _dismiss() {
        typeof this._resolve === "function" && this._resolve(null);
        this._resolve = null;
        this.open = false;
    }

    _hasMessage() {
        return !!this.message;
    }

    prompt(message, placeholder, type, confirmLabel, cancelLabel, preventDismiss = true, validation) {
        this.$.confirmButton.stop();
        this.message = message || "";
        this.type = type || defaultType;
        this.placeholder = placeholder || defaultPlaceholder;
        this.confirmLabel = confirmLabel || defaultConfirmLabel;
        this.cancelLabel = cancelLabel || defaultCancelLabel;
        this._hideCancelButton = cancelLabel === false;
        this.preventDismiss = preventDismiss;
        this.validationFn = validation;
        this._validationMessage = "";
        this.$.input.value = "";
        this.open = true;

        setTimeout(() => this.$.input.focus(), 100);

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}

window.customElements.define(DialogPrompt.is, DialogPrompt);
