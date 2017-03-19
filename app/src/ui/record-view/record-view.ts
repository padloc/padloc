/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Record } from "../../core/data";

export class RecordView extends Polymer.Element {

    static is = "pl-record-view";

    static properties = {
        record: Object
    }

    record: Record;

}

window.customElements.define(RecordView.is, RecordView);
