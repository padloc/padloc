(() => {

class RecordView extends Polymer.Element {

    static get is() { return "pl-record-view"; }

    static get properties() { return {
        dark: {
            type: Boolean,
            value: false,
            reflectToAttribute: true
        },
        open: {
            type: Boolean,
            value: false,
            observer: "_openChanged"
        },
        record: {
            type: Object,
            notify: true
        }
    }; }

    _fields() {
        if (!this.record) { return []; }
        let fields = this.record.record.fields;
        return fields.concat([{draft: true}]);
    }

    _openChanged() {
        this.dark = this.record ? this.record.dark : false;
        this.style.display = this.open ? "" : "none";
    }

    close() {
        this.open = false;
        this.record = null;
    }

}

window.customElements.define(RecordView.is, RecordView);

})();
