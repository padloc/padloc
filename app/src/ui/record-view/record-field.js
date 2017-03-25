/* global autosize */
(() => {

class RecordField extends Polymer.Element {

    static get is() { return "pl-record-field"; }

    static get properties() { return {
        _editing: {
            type: Boolean,
            computed: "_computeEditing(_editingName, _editingValue)",
            observer: "_editingChanged"
        },
        _editingName: {
            type: Boolean,
            value: false
        },
        _editingValue: {
            type: Boolean,
            value: false
        },
        field: Object
    }; }

    get nameInput() {
        return this.root.querySelector("input");
    }

    get valueInput() {
        return this.root.querySelector("textarea");
    }

    connectedCallback() {
        autosize(this.valueInput);
    }

    _computeEditing() {
        return this._editingName || this._editingValue;
    }

    _editingChanged() {
        if (!this._editing) {
            this.notifyPath("field.name");
            this.notifyPath("field.value");
            setTimeout(() => {
                autosize.update(this.valueInput);
            }, 200);
        }
    }

    _nameInputFocused() {
        this.classList.add("editing-name");
        this._editingName = true;
    }

    _nameInputBlurred() {
        this.classList.remove("editing-name");
        setTimeout(() => {
            this._editingName = false;
        }, 300);
    }

    _valueInputFocused() {
        this._editingValue = true;
    }

    _valueInputBlurred() {
        setTimeout(() => {
            this._editingValue = false;
        }, 300);
    }

    _keypress(e) {
        if (e.charCode === 13) {
            this._confirmEdit();
        }
    }

    _fireEditEvent() {
        this.dispatchEvent(new CustomEvent("field-change"));
    }

    _confirmEdit() {
        if (this._editingName) {
            this.field && (this.field.name = this.nameInput.value);
            this._editingName = false;
            this.valueInput.focus();
            this._fireEditEvent();
        } else if (this._editingValue) {
            this.field && (this.field.name = this.nameInput.value);
            this.field && (this.field.value = this.valueInput.value);
            this._editingValue = false;
            this._fireEditEvent();
        }
    }

    _cancelEdit() {
        this.nameInput.blur();
        this.valueInput.blur();
        this._editingName = false;
        this._editingValue = false;
    }

    _delete() {
        this.dispatchEvent(new CustomEvent("field-delete", { bubbles: true, composed: true }));
    }

}

window.customElements.define(RecordField.is, RecordField);

})();
