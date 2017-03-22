/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

export class Dialog extends Polymer.Element {

    static is = "pl-dialog";

    static properties = {
        open: {
            type: Boolean,
            value: false,
            observer: "_openChanged"
        },
        isShowing: {
            type: Boolean,
            value: false,
            notify: true
        },
        closeOnTap: Boolean,
        allowDismiss: {
            type: Boolean,
            value: true
        }
    }

    open: boolean;
    isShowing: boolean;
    closeOnTap: boolean;
    allowDismiss: boolean;

    _hideTimeout: number | null;

    //* Changed handler for the _open_ property. Shows/hides the dialog
    _openChanged() {
        // Set _display: block_ if we're showing. If we're hiding
        // we need to wait until the transitions have finished before we
        // set _display: none_.
        if (this.open) {
            if (this._hideTimeout) {
                clearTimeout(this._hideTimeout);
                this._hideTimeout = null;
            }
            this.style.display = "block";
            this.isShowing = true;
        } else {
            this._hideTimeout = window.setTimeout(() => {
                this.style.display = "none";
                this.isShowing = false;
            }, 250);
        }

        // Trigger relayout to make sure all elements have been rendered
        // when applying the transition
        this.offsetLeft;

        this.classList.toggle("open", this.open);

        // const opts = { bubbles: true, composed: true } as CustomEventInit;
        // this.dispatchEvent(new CustomEvent(this.open ? "dialog-open" : "dialog-close", opts));
    }

    //* Closes the popup (duh)
    _close() {
        this.open = false;
    }

    _dismiss() {
        if (this.allowDismiss) {
            this._close();
        }
    }

}

window.customElements.define(Dialog.is, Dialog);
