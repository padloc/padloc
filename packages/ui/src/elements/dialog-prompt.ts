import { localize } from "@padlock/core/lib/locale.js";
import { LitElement, html } from "@polymer/lit-element";
import sharedStyles from "../styles/shared.js";
import "./input.js";
import "./loading-button.js";
import "./dialog.js";

const defaultConfirmLabel = localize("OK");
const defaultCancelLabel = localize("Cancel");
const defaultType = "text";
const defaultPlaceholder = "";

class DialogPrompt extends LitElement {
    _render() {
        return html`
        <style include="shared">
            ${sharedStyles}

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
        this.shadowRoot!.querySelector("#confirmButton").start();
        const val = this.shadowRoot!.querySelector("#input").value;
        const p = typeof this.validationFn === "function" ? this.validationFn(val) : Promise.resolve(val);
        p.then(v => {
            this._validationMessage = "";
            this.shadowRoot!.querySelector("#confirmButton").success();
            typeof this._resolve === "function" && this._resolve(v);
            this._resolve = null;
            this.open = false;
        }).catch(e => {
            this.shadowRoot!.querySelector("#dialog").rumble();
            this._validationMessage = e;
            this.shadowRoot!.querySelector("#confirmButton").fail();
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
        this.shadowRoot!.querySelector("#confirmButton").stop();
        this.message = message || "";
        this.type = type || defaultType;
        this.placeholder = placeholder || defaultPlaceholder;
        this.confirmLabel = confirmLabel || defaultConfirmLabel;
        this.cancelLabel = cancelLabel || defaultCancelLabel;
        this._hideCancelButton = cancelLabel === false;
        this.preventDismiss = preventDismiss;
        this.validationFn = validation;
        this._validationMessage = "";
        this.shadowRoot!.querySelector("#input").value = "";
        this.open = true;

        setTimeout(() => this.shadowRoot!.querySelector("#input").focus(), 100);

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}

window.customElements.define("pl-dialog-prompt", DialogPrompt);
