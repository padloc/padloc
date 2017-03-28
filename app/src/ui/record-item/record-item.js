(() => {

class RecordItem extends Polymer.Element {

    static get is() { return "pl-record-item"; }

    static get properties() { return {
        dark: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
        },
        record: Object,
        open: {
            type: Boolean,
            observer: "_openChanged"
        }
    }; }

    // Replaces all non-newline characters in a given string with dots
    _obfuscate(value) {
        return value ? value.replace(/[^\n]/g, "\u2022") : "";
    }

    _openChanged() {
        this.style.display = this.open ? "block" : "none";
    }

    close() {
        this.open = false;
    }

}

window.customElements.define(RecordItem.is, RecordItem);

})();
