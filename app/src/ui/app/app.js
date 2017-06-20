(() => {

const Collection = padlock.data.Collection;
const Record = padlock.data.Record;
const Settings = padlock.data.Settings;
const LocalStorageSource = padlock.source.LocalStorageSource;
const EncryptedSource = padlock.source.EncryptedSource;
const CloudSource = padlock.source.CloudSource;

class App extends padlock.NotificationMixin(padlock.DialogMixin(padlock.BaseElement)) {

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
        "_saveSettings(settings.*)",
        "_autoLockChanged(settings.autoLock, settings.autoLockDelay)"
    ]; }

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new LocalStorageSource("coll_default"));
        this.settings = new Settings();
        this.settingsSource = new EncryptedSource(new LocalStorageSource("settings_encrypted"));
        this.cloudSource = new EncryptedSource(new CloudSource(this.settings));

        this._debouncedSynchronize = padlock.util.debounce(() => this.$.cloudView.synchronize(), 1000);

        const moved = () => this._autoLockChanged();
        document.addEventListener("touchstart", moved, false);
        document.addEventListener("keydown", moved, false);
        document.addEventListener("mousemove", padlock.util.debounce(moved, 50), false);

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);
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
        this.notifyPath("collection");
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
    }

    _deleteRecord(e) {
        e.detail.record.remove();
        this.save();
        this.notifyPath("collection.records");
        this._closeRecord();
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
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
            this._autoLockChanged();
        }, 500);
    }

    _getStarted() {
        this._unlocked();
        if (this.settings.syncEmail) {
            this.confirm("Would you like to pair this device with Padlock Cloud now?", "Yes", "Maybe Later")
                .then((confirm) => {
                    if (confirm) {
                        this.$.pages.select("cloudView");
                        this.$.cloudView.connect();
                    }
                });
        }
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

    _cancelAutoLock() {
        this._pausedAt = null;
        if (this._lockTimeout) {
            clearTimeout(this._lockTimeout);
        }
        if (this._lockNotificationTimeout) {
            clearTimeout(this._lockNotificationTimeout);
        }
    }

    _autoLockChanged() {
        this._cancelAutoLock();

        if (this.settings.autoLock && this.$.startView.open) {
            this._lockTimeout = setTimeout(() => {
                const delay = this.settings.autoLockDelay;
                this.lock();
                setTimeout(() => {
                    this.alert(`Padlock was automatically locked after
                        ${delay} ${delay > 1 ? "minutes" : "minute"}
                        of inactivity. You can change this behavior from the settings page.`);
                }, 1000);
            }, this.settings.autoLockDelay * 60 * 1000);
            this._lockNotificationTimeout = setTimeout(() => {
                this.notify("Auto-lock in 10 seconds", "info", 3000);
            }, this.settings.autoLockDelay * 50 * 1000);
        }
    }

    _resetData() {
        this.localSource.clear();
        this.settingsSource.clear();
        this.lock();
        setTimeout(() => this.alert("App reset successfully. Off to a fresh start!"), 500);
    }

    //* Keyboard shortcuts
    _keydown(event) {
        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            shortcut = () => this._back();
        }
        // CTRL/CMD + F -> Filter
        else if (control && event.key === "f") {
            shortcut = () => this.$.listView.focusFilterInput();
        }
        // CTRL/CMD + N -> New Record
        else if (control && event.key === "n") {
            shortcut = () => this._newRecord();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        }
    }

    _back() {
        switch (this._currentView) {
            case "recordView":
                this._closeRecord();
                break;
            case "settingsView":
                this._settingsBack();
                break;
            case "cloudView":
                this._cloudViewBack();
                break;
        }
    }

    _changePassword(e) {
        this.localSource.password = this.settingsSource.password = e.detail;
        Promise.all([
            this.collection.save(this.localSource),
            this.settings.save(this.settingsSource)
        ]).then(() => this.alert("Master password changed successfully."));
    }

    lock() {
        this.collection.clear();
        this.settings.clear();
        this.localSource.password = this.settingsSource.password = this.cloudSource.password = "";
        this.$.startView.reset();
        this.$.startView.open = false;
        this._autoLockChanged();
        setTimeout(() => this.notifyPath("collection"), 500);
    }

    save() {
        this.collection.save(this.localSource);
    }
}

window.customElements.define(App.is, App);

})();
