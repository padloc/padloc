(() => {

class RecordItem extends padlock.BaseElement {

    static get is() { return "pl-record-item"; }

    static get properties() { return {
        record: Object
    }; }

    // Replaces all non-newline characters in a given string with dots
    _obfuscate(value) {
        return value ? value.replace(/[^\n]/g, "\u2022") : "";
    }

    _copyField(e) {
        e.stopPropagation();
    }

    _fieldMouseDown(e) {
        e.stopPropagation();
    }

    _moreFieldsLabel() {
        const n = this.record.fields.length - 2;
        return n < 1 ? "" : n == 1 ? "1 more field" : (n + " more fields");
    }

}

window.customElements.define(RecordItem.is, RecordItem);

})();
