/* global autosize */
(() => {

class RecordField extends padlock.BaseElement {

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
        showGenerator: {
            type: Boolean,
            value: false,
            observer: "_showGeneratorChanged"
        },
        draft: {
            type: Boolean,
            value: false
        },
        field: {
            type: Object,
            value: () => { return { name: "", value: "" }; }
        }
    }; }

    connectedCallback() {
        super.connectedCallback();
        autosize(this.$.valueInput);
    }

    _computeEditing() {
        return this._editingName || this._editingValue;
    }

    _editingChanged(curr, prev) {
        if (!this._editing && !this.draft) {
            this.notifyPath("field.name");
            this.notifyPath("field.value");
            setTimeout(() => {
                autosize.update(this.$.valueInput);
            }, 200);
        }

        if (prev !== undefined) {
            this.dispatchEvent(new CustomEvent(this._editing ? "field-edit-start" : "field-edit-end"));
        }
    }

    _nameInputFocused() {
        this.classList.add("editing-name");
        this._editingName = true;
        this.showGenerator = false;
    }

    _nameInputBlurred() {
        this.classList.remove("editing-name");
        setTimeout(() => {
            this._editingName = false;
        }, 300);
    }

    _valueInputFocused() {
        if (this.field.name) {
            this._editingValue = true;
        } else {
            this.$.nameInput.focus();
        }
    }

    _valueInputBlurred() {
        setTimeout(() => {
            this._editingValue = false;
        }, 300);
    }

    _keyup(e) {
        if (e.keyCode === 13 && e.target !== this.$.valueInput) {
            this._confirmEdit();
        } else if (e.keyCode == 27) {
            this._cancelEdit();
        }
    }

    _fireEditEvent() {
        this.dispatchEvent(new CustomEvent("field-change"));
    }

    _confirmEdit() {
        if (this._editingName && this.$.nameInput.value) {
            this.field && (this.field.name = this.$.nameInput.value);
            this.$.valueInput.focus();
            this._fireEditEvent();
        } else if (this._editingValue) {
            this.field && (this.field.name = this.$.nameInput.value);
            this.field && (this.field.value = this.$.valueInput.value);
            this._fireEditEvent();
        }
    }

    _cancelEdit() {
        this.$.nameInput.blur();
        this.$.valueInput.blur();
        this._editingName = false;
        this._editingValue = false;
        if (this.draft) {
            this.$.nameInput.value = this.$.valueInput.value = "";
        }
    }

    _delete() {
        this.dispatchEvent(new CustomEvent("field-delete", { bubbles: true, composed: true }));
    }

    _valuePlaceholder() {
        return this.draft ? "" : "Empty Field";
    }

    _toggleGenerator() {
        this.showGenerator = !this.showGenerator;
        if (this.showGenerator) {
            this.$.generator.generate();
        }
    }

    _generatorConfirm() {
        this.showGenerator = false;
        this.$.valueInput.value = this.$.generator.value;
        this.$.valueInput.focus();
    }

    _generatorCancel() {
        this.showGenerator = false;
    }

    _showGeneratorChanged() {
        this.dispatchEvent(new CustomEvent(this.showGenerator ? "generator-show" : "generator-hide"));
    }

    edit() {
        const input = this.field && this.field.name ? this.$.valueInput : this.$.nameInput;
        input.focus();
    }
}

window.customElements.define(RecordField.is, RecordField);

})();
