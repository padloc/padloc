(() => {

const { LocaleMixin, DialogMixin, DataMixin, AnimationMixin, BaseElement } = padlock;
const { applyMixins } = padlock.util;

class RecordView extends applyMixins(
    BaseElement,
    DataMixin,
    LocaleMixin,
    DialogMixin,
    AnimationMixin
) {

    static get is() { return "pl-record-view"; }

    static get properties() { return {
        animationOptions: {
            type: Object,
            value: {
                clear: true,
                fullDuration: 800
            }
        },
        record: {
            type: Object,
            notify: true,
            observer: "_recordObserver"
        },
        _catListShowing: {
            type: Boolean,
            value: false
        }
    }; }

    static get observers() { return [
        "_setBackground(record.fields.length)"
    ]; }

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

    _setBackground(nFields) {
        const shade = 4 - Math.abs(4 - (nFields + 2 % 8));
        this.style.background = `var(--shade-${shade + 1}-color)`;
    }

    _newFieldEnter() {
        if (!this.record) {
            return;
        }

        const newField = this.$.newField.field;
        if (newField.name && newField.value) {
            this.push("record.fields", newField);
            this.animateElement(this.$.newFieldWrapper);
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
        setTimeout(() => {
            this.set("record.category", e.model.item);
            this._fireChangeEvent();
        }, 300);
    }

    _showCategoryList() {
        this._catListShowing = true;
    }

    _hideCategoryList() {
        this._catListShowing = false;
    }

    _toggleCategoryList() {
        if (!this._catListShowing || this.record.category) {
            this.$.categoryInput.value = "";
            this._catListShowing = true;
            this.$.categoryInput.focus();
        } else {
            this._catListShowing = false;
        }
    }

    _dropDownIcon() {
        return this._catListShowing && !this.record.category ? "dropup" : "dropdown";
    }

    _recordObserver() {
        this.$.main.style.visibility = "hidden";
        setTimeout(() => {
            this.$.main.style.visibility = "";
            this.animateCascade(this.root.querySelectorAll(".animate"));
        }, 100);
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
