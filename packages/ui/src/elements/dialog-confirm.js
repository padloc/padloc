import "../styles/shared.js";
import { BaseElement, html } from "./base.js";
import { localize } from "@padlock/core/lib/locale.js";
import "./dialog.js";

const defaultMessage = localize("Are you sure you want to do this?");
const defaultConfirmLabel = localize("Confirm");
const defaultCancelLabel = localize("Cancel");

class DialogConfirm extends BaseElement {
    static get template() {
        return html`
        <style include="shared"></style>

        <pl-dialog open="{{ open }}" prevent-dismiss="">
            <div class="message tiles-1">{{ message }}</div>
            <button class="tap tiles-2" on-click="_confirm">{{ confirmLabel }}</button>
            <button class="tap tiles-3" on-click="_cancel">{{ cancelLabel }}</button>
        </pl-dialog>
`;
    }

    static get is() {
        return "pl-dialog-confirm";
    }

    static get properties() {
        return {
            confirmLabel: { type: String, value: defaultConfirmLabel },
            cancelLabel: { type: String, value: defaultCancelLabel },
            message: { type: String, value: defaultMessage },
            open: { type: Boolean, value: false }
        };
    }

    _confirm() {
        this.dispatchEvent(new CustomEvent("dialog-confirm", { bubbles: true, composed: true }));
        this.open = false;
        typeof (this._resolve === "function") && this._resolve(true);
        this._resolve = null;
    }

    _cancel() {
        this.dispatchEvent(new CustomEvent("dialog-cancel", { bubbles: true, composed: true }));
        this.open = false;
        typeof (this.resolve === "function") && this._resolve(false);
        this._resolve = null;
    }

    confirm(message, confirmLabel, cancelLabel) {
        this.message = message || defaultMessage;
        this.confirmLabel = confirmLabel || defaultConfirmLabel;
        this.cancelLabel = cancelLabel || defaultCancelLabel;
        this.open = true;

        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }
}

window.customElements.define(DialogConfirm.is, DialogConfirm);
