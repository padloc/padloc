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

    _fireChangedEvent() {
        this.dispatchEvent(new CustomEvent("record-change", { bubbles: true, composed: true }));
    }

    _deleteField(e) {
        const confirmDialog = this.root.querySelector("pl-dialog-confirm");
        confirmDialog.confirm("Are you sure you want to delete this field?", "Delete").then((confirmed) => {
            if (confirmed) {
                this.splice("record.fields", e.model.index, 1);
                this._fireChangedEvent();
            }
        });
    }

    _fields() {
        if (!this.record) { return []; }
        return this.record.fields.concat([{draft: true}]);
    }

    close() {
        this.dispatchEvent(new CustomEvent("record-close"));
    }

}

window.customElements.define(RecordView.is, RecordView);

})();
