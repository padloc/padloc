(() => {

const Collection = padlock.data.Collection;
const Record = padlock.data.Record;
const LocalStorageSource = padlock.source.LocalStorageSource;
const EncryptedSource = padlock.source.EncryptedSource;

class App extends Polymer.Element {
    static get is() { return "pl-app"; }

    static get properties() { return {
        _selectedRecord: {
            type: Object,
            value: null,
            observer: "_selectedRecordChanged"
        }
    }; }

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("default_coll"));
        this.localSource.password = "password";
    }

    get mainMenu() {
        return this.root.querySelector("#mainMenu");
    }

    get listView() {
        return this.root.querySelector("pl-list-view");
    }

    get recordView() {
        return this.root.querySelector("pl-record-view");
    }

    ready() {
        super.ready();
        this.fetch();
    }

    _selectedRecordChanged() {
        // this.recordView.dark = this._selectedRecord && this._selectedRecord.dark;
        this.listView.style.display = this._selectedRecord ? "none" : "";
        this.recordView.style.display = this._selectedRecord ? "" : "none";
    }

    _closeRecordView() {
        this._selectedRecord = null;
    }

    addRecord(name) {
        this.collection.add(new Record(name));
        this.notifyPath("collection.records");
    }

    save() {
        this.collection.save(this.localSource);
    }

    fetch() {
        return this.collection.fetch(this.localSource).then(() => {
            this.notifyPath("collection.records");
        });
    }

    openMainMenu() {
        this.mainMenu.open = true;
    }
}

window.customElements.define(App.is, App);

})();
