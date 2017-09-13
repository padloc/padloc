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
        const shade = nFields === 0 ? 2 : 4 - Math.abs(4 - (nFields % 8));
        this.style.background = `var(--shade-${shade + 1}-color)`;
    }

    _newFieldEnter() {
        if (!this.record) {
            return;
        }

        const newField = this.$.newField.field;
        if (newField.name && newField.value) {
            this.push("record.fields", newField);
            this.$.newFieldWrapper.style.animation = "";
            this.$.newFieldWrapper.offsetLeft;
            this.$.newFieldWrapper.style.animation = "slideIn 500ms ease 0s both";
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
        this.$.header.style.visibility = this.$.main.style.visibility = "hidden";
        setTimeout(() => {
            this.$.header.style.visibility = this.$.main.style.visibility = "";
            this._animateFields();
        }, 100);
    }

    _animateFields() {
        const duration = 500;
        const dt = 50;
        const fields = Array.from(this.root.querySelectorAll(".animate"));

        for (const [i, f] of fields.entries()) {
            const delay = dt * i;
            f.style.animation = "";
            f.offsetLeft;
            f.style.animation = `slideIn ${duration}ms ease ${delay}ms both`;
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
