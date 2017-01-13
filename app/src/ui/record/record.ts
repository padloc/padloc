/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

export class RecordElement extends Polymer.Element {

    static is = "pl-record";

    static config = {
        properties: {
            record: Object,
            open: {
                type: Boolean,
                observer: "_openChanged"
            }
        }
    }

    record: Record;
    open: boolean;

    _openChanged() {
        this.style.display = this.open ? "block" : "none";
    }

    close() {
        this.open = false;
    }

}

window.customElements.define(RecordElement.is, RecordElement);
