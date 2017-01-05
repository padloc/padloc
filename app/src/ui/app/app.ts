/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Collection, Record } from "../../core/data";
import { LocalStorageSource, EncryptedSource } from "../../core/source";

import "../list-view/list-view";
import "../record-view/record-view";
import { RecordView } from "../record-view/record-view";

export class App extends Polymer.Element {
    static is = "pl-app";

    private collection: Collection;
    private localSource: EncryptedSource;

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("default_coll"));
        this.localSource.password = "password";
    }

    get recordView(): RecordView {
        return this.root.querySelector("pl-record-view") as RecordView;
    }

    async ready() {
        super.ready();
        await this.fetch();
        this.recordView.record = this.collection.records[0];
        this.recordView.style.display = "block";
    }

    addRecord(name: string) {
        this.collection.add(new Record(name));
        this.notifyPath("collection.records");
    }

    save() {
        this.collection.save(this.localSource);
    }

    async fetch(): Promise<void> {
        await this.collection.fetch(this.localSource);
        this.notifyPath("collection.records");
    }
}

window.customElements.define(App.is, App);
