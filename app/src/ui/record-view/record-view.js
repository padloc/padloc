(() => {

const { LocaleMixin, DialogMixin, DataMixin, BaseElement } = padlock;
const { applyMixins } = padlock.util;

class RecordView extends applyMixins(
    BaseElement,
    DataMixin,
    LocaleMixin,
    DialogMixin
) {

    static get is() { return "pl-record-view"; }

    static get properties() { return {
        record: {
            type: Object,
            notify: true
        },
        _catListShowing: {
            type: Boolean,
            value: false
        }
    }; }

    recordCreated(record) {
        setTimeout(() => {
            if (record === this.record && !padlock.platform.isTouch()) {
                this.edit();
            }
        }, 500);
    }

    _fireChangeEvent() {
        this.dispatch("record-changed", this.record);
    }

    _deleteField(e) {
        this.confirm($l("Are you sure you want to delete this field?"), $l("Delete")).then((confirmed) => {
            if (confirmed) {
                this.splice("record.fields", e.model.index, 1);
                this._fireChangeEvent();
            }
        });
    }

    _fieldClass(index) {
        return "tiles-" + (Math.floor((index + 1) % 8) + 1);
    }

    _spacerClass(nFields) {
        return this._fieldClass(nFields + 1);
    }

    _newFieldEnter() {
        if (!this.record) {
            return;
        }

        const newField = this.$.newField.field;
        if (newField.name && newField.value) {
            this.push("record.fields", newField);
            if (!padlock.platform.isTouch()) {
                this.$.newField.edit();
            }
        }
        this.$.newField.field = { name: "", value: "" };

        setTimeout(() => this._fireChangeEvent(), 500);
    }

    _deleteRecord() {
        this.confirm($l("Are you sure you want to delete this record?"), $l("Delete")).then((confirmed) => {
            if (confirmed) {
                this.deleteRecord(this.record);
            }
        });
    }

    _categoryFilter(currCat) {
        return currCat ? (cat) => {
            return cat && cat !== currCat && cat.toLowerCase().startsWith(currCat.toLowerCase());
        } : null;
    }

    _selectCategory(e) {
        this.set("record.category", e.model.item);
        this._fireChangeEvent();
    }

    _showCategoryList() {
        this._catListShowing = true;
    }

    _hideCategoryList() {
        setTimeout(() => this._catListShowing = false, 100);
    }

    _showFullCategoryList() {
        this.$.categoryInput.value = "";
        setTimeout(() => this.$.categoryInput.focus(), 100);
    }

    _closeOtherGenerators(e) {
        for (const field of this.root.querySelectorAll("pl-record-field")) {
            if (field !== e.target) {
                field.showGenerator = false;
            }
        }
    }

    close() {
        if (!this.record.name) {
            this.alert($l("Please enter a record name!")).then(() => this.edit());
            return;
        }
        this.dispatchEvent(new CustomEvent("record-close"));
    }

    edit() {
        this.$.nameInput.focus();
    }

}

window.customElements.define(RecordView.is, RecordView);

})();
