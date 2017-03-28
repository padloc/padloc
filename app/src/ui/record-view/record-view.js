(() => {

class RecordView extends Polymer.Element {

    static get is() { return "pl-record-view"; }

    static get properties() { return {
        dark: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
        },
        draft: {
            type: Boolean,
            value: false
        },
        record: {
            type: Object,
            notify: true
        }
    }; }

    _fireChangeEvent() {
        this.dispatchEvent(new CustomEvent("record-change", { detail: { record: this.record } }));
    }

    _deleteField(e) {
        const confirmDialog = this.root.querySelector("pl-dialog-confirm");
        confirmDialog.confirm("Are you sure you want to delete this field?", "Delete").then((confirmed) => {
            if (confirmed) {
                this.splice("record.fields", e.model.index, 1);
                this._fireChangeEvent();
            }
        });
    }

    _fieldClass(index) {
        return "tiles-" + (Math.floor(index % 6) + 1);
    }

    _spacerClass(nFields) {
        return "spacer " + this._fieldClass(nFields + 1);
    }

    _newFieldEnter() {
        const newField = this.$.newField.field;
        if (newField.name && newField.value) {
            this.push("record.fields", newField);
        }
        this.$.newField.field = { name: "", value: "" };
        this._fireChangeEvent();
    }

    _createRecord() {
        if (this.draft) {
            this.dispatchEvent(new CustomEvent("record-create", { detail: { record: this.record } }));
        }
    }

    close() {
        this.dispatchEvent(new CustomEvent("record-close"));
    }

    edit() {
        this.$.nameInput.focus();
    }

}

window.customElements.define(RecordView.is, RecordView);

})();
