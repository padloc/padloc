/// <reference path="../../../../typings/dom.d.ts" />
/// <reference path="../../../../typings/polymer.d.ts" />

import { Collection, Record } from "../../core/data";
import { LocalStorageSource, EncryptedSource } from "../../core/source";
import { ListView } from "../list-view/list-view";
import { Dialog } from "../dialog/dialog";
import { RecordView } from "../record-view/record-view";
import { RecordElement } from "../record/record";

import "../dialog/dialog";
import "../list-view/list-view";
import "../record-view/record-view";


export class App extends Polymer.Element {
    static is = "pl-app";

    static properties = {
        _selectedRecord: {
            type: Object,
            observer: "_selectedRecordChanged"
        }
    };

    private collection: Collection;
    private localSource: EncryptedSource;
    private _selectedRecord: RecordElement;

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("default_coll"));
        this.localSource.password = "password";
    }

    get mainMenu(): Dialog {
        return this.root.querySelector("#mainMenu") as Dialog;
    }

    get listView(): ListView {
        return this.root.querySelector("pl-list-view") as ListView;
    }

    get recordView(): RecordView {
        return this.root.querySelector("pl-record-view") as RecordView;
    }

    async ready() {
        super.ready();
        await this.fetch();
    }

    _selectedRecordChanged() {
        this.recordView.open = !!this._selectedRecord;
        this.listView.style.display = this._selectedRecord ? "none" : "";
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

    openMainMenu() {
        this.mainMenu.open = true;
    }
}

window.customElements.define(App.is, App);
