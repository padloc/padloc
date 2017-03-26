(() => {

class Dialog extends Polymer.Element {

    static get is() { return "pl-dialog"; }

    static get properties() { return {
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
        preventDismiss: {
            type: Boolean,
            value: false
        }
    }; }

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
        if (!this.preventDismiss) {
            this._close();
        }
    }

}

window.customElements.define(Dialog.is, Dialog);

})();
