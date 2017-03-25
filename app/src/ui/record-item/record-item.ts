/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

export class RecordElement extends Polymer.Element {

    static get is = "pl-record";

    static get properties = {
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
    };

    dark: Boolean;
    record: Record;
    open: boolean;

    // Replaces all non-newline characters in a given string with dots
    _obfuscate(value: string) {
        return value.replace(/[^\n]/g, "\u2022");
    }

    _openChanged() {
        this.style.display = this.open ? "block" : "none";
    }

    _limit(arr: any[]) {
        return arr ? arr.slice(0, 2) : [];
    }

    close() {
        this.open = false;
    }

}

window.customElements.define(RecordElement.is, RecordElement);
