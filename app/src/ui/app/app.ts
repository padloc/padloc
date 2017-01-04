/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Collection, Record } from "../../core/data";
import { LocalStorageSource, EncryptedSource } from "../../core/source";

import "../list-view/list-view";

export class PadlockApp extends Polymer.Element {
    static is = "padlock-app";

    private collection: Collection;
    private localSource: EncryptedSource;

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("default_coll"));
        this.localSource.password = "password";
    }

    ready() {
        super.ready();
        this.fetch();
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

window.customElements.define(PadlockApp.is, PadlockApp);
