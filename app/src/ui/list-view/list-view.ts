/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

import "../record/record";
import { RecordElement } from "../record/record";

export class ListView extends Polymer.Element {
    static is = "pl-list-view";

    static config = {
        properties: {
            records: Array
        }
    }

    records: Record[];

    get recordElement(): RecordElement {
        return this.root.querySelector("pl-record") as RecordElement;
    }

    _isEmpty() {
        return !this.records.length;
    }

    }

    _recordTapped({model: {item}}: {model: {item: Record}}) {
        this.recordElement.record = item;
        this.recordElement.open = true;
    }
}

window.customElements.define(ListView.is, ListView);
