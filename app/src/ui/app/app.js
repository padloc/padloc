(() => {

const Collection = padlock.data.Collection;
const Record = padlock.data.Record;
const LocalStorageSource = padlock.source.LocalStorageSource;
const EncryptedSource = padlock.source.EncryptedSource;

class App extends Polymer.Element {

    static get is() { return "pl-app"; }

    static get properties() { return {
        _currentView: {
            type: "string",
            value: "startView"
        },
        _selectedRecord: {
            type: Object,
            observer: "_selectedRecordChanged"
        }
    }; }

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

    _closeRecord() {
        this.$.listView.deselect();
        this.$.pages.select("listView");
    }

    _newRecord() {
        this.$.recordView.draft = true;
        this.$.recordView.record = new Record();
        this.$.pages.select("recordView");
        this.$.recordView.edit();
    }

    _recordChange(e) {
        const record = e.detail.record;
        record.updated = new Date();
        this.save();
        this.notifyPath("collection.categories");
    }

    _createRecord(e) {
        this.collection.add(e.detail.record);
        this.notifyPath("collection.records");
        this.notifyPath("collection.categories");
        this.save();
        this._closeRecord();
    }

    _deleteRecord(e) {
        e.detail.record.remove();
        this.save();
        this.notifyPath("collection.records");
        this._closeRecord();
    }

    _selectedRecordChanged() {
        if (this._selectedRecord) {
            this.$.recordView.draft = false;
            this.$.pages.select("recordView");
        }
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
        this.$.mainMenu.open = true;
    }
}

window.customElements.define(App.is, App);

})();
