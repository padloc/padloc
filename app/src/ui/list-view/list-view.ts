/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

import "../record/record";
import "../record-view/record-view";
import { RecordView } from "../record-view/record-view";

export class ListView extends Polymer.Element {
    static is = "pl-list-view";

    static properties = {
        records: {
            type: Array,
            observer: "_recordsChanged"
        }
    };

    _nCols: number;

    records: Record[];

    connectedCallback() {
        this._resized();
        window.addEventListener("resize", this._resized.bind(this));
    }

    get recordView(): RecordView {
        return this.root.querySelector("pl-record-view") as RecordView;
    }

    _isEmpty() {
        return !this.records.length;
    }

    _recordClass(i: number) {
        const nRow = Math.floor(i / this._nCols);

        if (!(this._nCols % 2) && nRow % 2) {
            i++;
        }

        return i % 2 ? "odd" : "even";
    }

    _recordsChanged() {
        this.recordView.record = this.records[0];
    }

    // _recordTapped({model: {item}}: {model: {item: Record}}) {
    //     this.recordView.record = item;
    //     this.recordView.open = true;
    // }

    _resized() {
        const width = this.offsetWidth;
        const recMinWidth = 250;
        const nCols = Math.floor(width / recMinWidth);
        if (nCols !== this._nCols) {
            this._nCols = nCols;
            this.notifyPath("records");
        }
    }
}

window.customElements.define(ListView.is, ListView);
