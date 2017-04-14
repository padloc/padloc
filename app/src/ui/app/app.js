(() => {

const Collection = padlock.data.Collection;
const Record = padlock.data.Record;
const Settings = padlock.data.Settings;
const LocalStorageSource = padlock.source.LocalStorageSource;
const EncryptedSource = padlock.source.EncryptedSource;
const CloudSource = padlock.source.CloudSource;

class App extends padlock.BaseElement {

    static get is() { return "pl-app"; }

    static get properties() { return {
        collection: Object,
        localSource: Object,
        settings: Object,
        settingsSource: Object,
        cloudSource: Object,
        _currentView: {
            type: "string",
            value: "placeholderView",
            observer: "_currentViewChanged"
        },
        _selectedRecord: {
            type: Object,
            observer: "_selectedRecordChanged"
        }
    }; }

    static get observers() { return [
        "_saveSettings(settings.*)"
    ]; }

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("coll_default"));
        this.settings = new Settings();
        this.settingsSource = new EncryptedSource(new LocalStorageSource("settings_encrypted"));
        this.cloudSource = new EncryptedSource(new CloudSource(this.settings));
    }

    _closeRecord() {
        this.$.listView.deselect();
        this.$.pages.select("placeholderView");
    }

    _newRecord() {
        const record = new Record();
        this.collection.add(record);
        this.notifyPath("collection.records");
        this.$.listView.select(record);
        setTimeout(() => this.$.recordView.edit(), 500);
    }

    _recordChange(e) {
        const record = e.detail.record;
        record.updated = new Date();
        this.save();
        this.notifyPath("collection.categories");
    }

    _deleteRecord(e) {
        e.detail.record.remove();
        this.save();
        this.notifyPath("collection.records");
        this._closeRecord();
    }

    _selectedRecordChanged() {
        if (this._selectedRecord) {
            this.$.pages.select("recordView");
        } else {
            if (this._currentView == "recordView") {
                this.$.pages.select("placeholderView");
            }
        }
    }

    _unlocked() {
        this.cloudSource.password = this.localSource.password;
        this.notifyPath("collection.records");
        setTimeout(() => {
            this.$.startView.open = true;
        }, 500);
    }

    _openSettings() {
        this.$.pages.select("settingsView");
        this.$.listView.deselect();
    }

    _settingsBack() {
        this.$.pages.select("placeholderView");
    }

    _saveSettings() {
        if (this.settings.loaded) {
            this.settings.save(this.settingsSource);
        }
    }

    _openCloudView() {
        this.$.pages.select("cloudView");
        this.$.listView.deselect();
    }

    _cloudViewBack() {
        this.$.pages.select("placeholderView");
    }

    _currentViewChanged() {
        this.$.pages.classList.toggle("showing", this._currentView !== "placeholderView");
    }

    lock() {
        this.collection.clear();
        this.settings.clear();
        this.localSource.password = this.settingsSource.password = this.cloudSource.password = "";
        this.$.startView.reset();
        this.$.startView.open = false;
        setTimeout(() => this.notifyPath("collection"), 500);
    }

    save() {
        this.collection.save(this.localSource);
    }
}

window.customElements.define(App.is, App);

})();
