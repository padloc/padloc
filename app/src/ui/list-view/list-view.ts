/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";
import { RecordElement } from "../record/record";

import "../record/record";

export class ListView extends Polymer.Element {
    static is = "pl-list-view";

    static properties = {
        records: Array,
        selected: {
            type: Object,
            notify: true
        }
    };

    _nCols: number;

    records: Record[];
    selected: RecordElement;

    connectedCallback() {
        this._resized();
        window.addEventListener("resize", this._resized.bind(this));
    }

    _isEmpty() {
        return !this.records.length;
    }

    _isDark(i: number): Boolean {
        const nRow = Math.floor(i / this._nCols);

        if (!(this._nCols % 2) && nRow % 2) {
            i++;
        }

        return !!(i % 2);
    }

    // _recordTapped({ model: { item } }: { model: { item: Record } }) {
    // _recordTapped({ event: { target } }: { event: { target: RecordElement } }) {
    _recordTapped(e: MouseEvent) {
        this.selected = e.target as RecordElement;
    }

    _resized() {
        const width = this.offsetWidth;
        const recMinWidth = 250;
        this._nCols = Math.floor(width / recMinWidth);
    }

    _openMenu() {
        this.dispatchEvent(new CustomEvent("open-menu"));
    }
}

window.customElements.define(ListView.is, ListView);
