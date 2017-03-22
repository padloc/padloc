/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

// import { Record } from "../../core/data";

import { RecordElement } from "../record/record";

export class RecordView extends Polymer.Element {

    static is = "pl-record-view";

    static properties = {
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
    }

    dark: Boolean;
    open: Boolean;
    record: RecordElement | null;

    _fields() {
        if (!this.record) { return []; }
        let fields = this.record.record.fields as any[];
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
