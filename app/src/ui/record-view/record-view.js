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
        _showCatList: {
            type: Boolean,
            value: false
        },
        _catCount: {
            type: Number,
            value: 0
        },
        _edited: {
            type: Boolean,
            value: false
        }
    }; }

    static get observers() { return [
        "_setBackground(record.fields.length)"
    ]; }

    recordCreated(record) {
        setTimeout(() => {
            if (record === this.record) {
                this.edit();
            }
        }, 500);
    }

    _catListShowing() {
        return this._showCatList && !!this._catCount;
    }

    _categoryClicked() {
        this.$.categoryInput.focus();
    }

    _setEdited() {
        this.dispatch("record-changed", this.record);
        this._edited = true;
    }

    _debouncedFinishEditing() {
        this._deferFinishEditing();
        this._changeTimeout = setTimeout(() => {
            if (this._edited) {
                this.dispatch("record-finished-editing", this.record);
                this._edited = false;
            }
        }, 500);
    }

    _deferFinishEditing() {
        clearTimeout(this._changeTimeout);
    }

    _deleteField(e) {
        this.confirm($l("Are you sure you want to delete this field?"), $l("Delete")).then((confirmed) => {
            if (confirmed) {
                this.splice("record.fields", e.model.index, 1);
                this._setEdited();
            }
        });
    }

    _inputFocused() {
        this._deferFinishEditing();
        this._hideCategoryList();
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
                setTimeout(() => this.$.newField.edit(), 10);
            }
            this._setEdited();
        }

        this.$.newField.field = { name: "", value: "" };

        this._debouncedFinishEditing();
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
            this._setEdited();
            this.$.categoryInput.focus();
        }, 300);
    }

    _categoryInputFocused() {
        this._deferFinishEditing();
        this._showCategoryList();
    }

    _showCategoryList() {
        this._showCatList = true;
    }

    _hideCategoryList() {
        this._showCatList = false;
    }

    _toggleCategoryList(e) {
        e.stopPropagation();

        if (!this._showCatList || this.record.category) {
            this.$.categoryInput.value = "";
            this._showCatList = true;
            this.$.categoryInput.focus();
        } else {
            this._showCatList = false;
        }
    }

    _dropDownIcon() {
        return this._catListShowing() && this.record && !this.record.category ? "dropup" : "dropdown";
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

    finishEditing() {
        Array.from(this.root.querySelectorAll("pl-input"))
            .forEach((i) => i.blur());
        Array.from(this.root.querySelectorAll("pl-record-field"))
            .forEach((f) => f.finishEditing());
    }
}

window.customElements.define(RecordView.is, RecordView);

})();
