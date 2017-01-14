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

    // Replaces all non-newline characters in a given string with dots
    _obfuscate(value: string) {
        return value.replace(/[^\n]/g, "\u2022");
    }

    _openChanged() {
        this.style.display = this.open ? "block" : "none";
    }

    close() {
        this.open = false;
    }

}

window.customElements.define(RecordElement.is, RecordElement);
