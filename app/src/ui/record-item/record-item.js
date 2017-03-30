(() => {

class RecordItem extends Polymer.Element {

    static get is() { return "pl-record-item"; }

    static get properties() { return {
        record: Object
    }; }

    // Replaces all non-newline characters in a given string with dots
    _obfuscate(value) {
        return value ? value.replace(/[^\n]/g, "\u2022") : "";
    }

}

window.customElements.define(RecordItem.is, RecordItem);

})();
