/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

export class ListView extends Polymer.Element {
    static is = "pl-list-view";

    static config = {
        properties: {
            records: Array
        }
    }

    records: Record[];

    _isEmpty() {
        return !this.records.length;
    }
}

window.customElements.define(ListView.is, ListView);
