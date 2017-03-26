(() => {

class RecordView extends Polymer.Element {

    static get is() { return "pl-record-view"; }

    static get properties() { return {
        dark: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
        },
        record: {
            type: Object,
            notify: true
        }
    }; }

    _fireChangeEvent() {
        this.dispatchEvent(new CustomEvent("record-change", { bubbles: true, composed: true }));
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

    _newFieldEnter() {
        const newField = this.$.newField.field;
        if (newField.name && newField.value) {
            this.push("record.fields", newField);
        }
        this.$.newField.field = { name: "", value: "" };
        console.log("new field enter");
    }

    close() {
        this.dispatchEvent(new CustomEvent("record-close"));
    }

}

window.customElements.define(RecordView.is, RecordView);

})();
