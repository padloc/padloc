/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Collection, Record } from "../../core/data";
import { LocalStorageSource, EncryptedSource } from "../../core/source";

import "../list-view/list-view";

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

    async ready() {
        super.ready();
        await this.fetch();
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
