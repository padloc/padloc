(() => {

const Collection = padlock.data.Collection;
const Record = padlock.data.Record;
const Settings = padlock.data.Settings;
const FileSource = padlock.source.FileSource;
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
        locked: {
            type: Boolean,
            value: true,
            observer: "_lockedChanged"
        },
        _currentView: {
            type: String,
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
        "_autoLockChanged(settings.autoLock, settings.autoLockDelay, locked)"
    ]; }

    constructor() {
        super();
        this.collection = new Collection();
        this.localSource = new EncryptedSource(new FileSource("data.pls"));
        this.settings = new Settings();
        this.settingsSource = new EncryptedSource(new FileSource("settings.pls"));
        this.cloudSource = new EncryptedSource(new CloudSource(this.settings));

        this._debouncedSynchronize = padlock.util.debounce(() => this.$.cloudView.synchronize(), 1000);

        const moved = () => this._autoLockChanged();
        document.addEventListener("touchstart", moved, false);
        document.addEventListener("keydown", moved, false);
        document.addEventListener("mousemove", padlock.util.debounce(moved, 300), false);

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);

        document.addEventListener("dialog-open", () => this.classList.add("dialog-open"));
        document.addEventListener("dialog-close", () => this.classList.remove("dialog-open"));
    }

    get _isNarrow() {
        return this.offsetWidth < 700;
    }

    _closeRecord() {
        this.$.listView.deselect();
    }

    _newRecord() {
        const record = new Record($l("New Record"));
        this.collection.add(record);
        this.notifyPath("collection");
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
        this._closeRecord();
        e.detail.record.remove();
        this.save();
        this.notifyPath("collection");
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
    }

    _selectedRecordChanged() {
        clearTimeout(this._selectedRecordChangedTimeout);
        this._selectedRecordChangedTimeout = setTimeout(() => {
            if (this._selectedRecord) {
                setTimeout(() => this._currentView = "recordView");
                setTimeout(() => this.$.recordView.record = this._selectedRecord, this._isNarrow ? 50 : 0);
            } else {
                if (this._currentView == "recordView") {
                    this._currentView = "placeholderView";
                }
            }
        }, 10);
    }

    _unlocked() {
        this.cloudSource.password = this.localSource.password;
        this.notifyPath("collection");
        this.locked = false;
        this.$.startView.open = true;
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
    }

    _getStarted() {
        this._unlocked();
        if (this.settings.syncEmail) {
            this.confirm($l("Would you like to pair this device with Padlock Cloud now?"), $l("Yes"), $l("Maybe Later"))
                .then((confirm) => {
                    if (confirm) {
                        this._currentView = "cloudView";
                        this.$.cloudView.connect();
                    }
                });
        }
    }

    _openSettings() {
        this._currentView = "settingsView";
        this.$.listView.deselect();
    }

    _settingsBack() {
        this._currentView = "placeholderView";
    }

    _saveSettings() {
        if (this.settings.loaded) {
            this.settings.save(this.settingsSource);
        }
    }

    _openCloudView() {
        this._currentView = "cloudView";
        this.$.listView.deselect();
    }

    _cloudViewBack() {
        this._currentView = "placeholderView";
    }

    _currentViewChanged() {
        this.$.main.classList.toggle("showing-pages", this._currentView !== "placeholderView");
        clearTimeout(this._switchPagesTimeout);
        // If we're in narrow layout, wait for animation to finish before switching to placeholder view
        this._switchPagesTimeout = setTimeout(() => this.$.pages.select(this._currentView),
            this._currentView === "placeholderView" && this._isNarrow ? 300 : 0);
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

        if (this.settings.autoLock && !this.locked) {
            this._lockTimeout = setTimeout(() => {
                const delay = this.settings.autoLockDelay;
                this.lock();
                setTimeout(() => {
                    this.alert($l("Padlock was automatically locked after {0} {1} " +
                    "of inactivity. You can change this behavior from the settings page.",
                    delay, delay > 1 ? $l("minutes") : $l("minute")));
                }, 1000);
            }, this.settings.autoLockDelay * 60 * 1000);
            this._lockNotificationTimeout = setTimeout(() => {
                this.notify($l("Auto-lock in 10 seconds"), "info", 3000);
            }, this.settings.autoLockDelay * 50 * 1000);
        }
    }

    _resetData() {
        this.localSource.clear();
        this.settingsSource.clear();
        this.lock();
        setTimeout(() => this.alert($l("App reset successfully. Off to a fresh start!")), 500);
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
        ]).then(() => this.alert($l("Master password changed successfully.")));
    }

    _lockedChanged() {
        this.$.main.classList.toggle("active", !this.locked);
        this._autoLockChanged();
    }

    lock() {
        this.collection.clear();
        this.settings.clear();
        this.localSource.password = this.settingsSource.password = this.cloudSource.password = "";
        this.$.startView.reset();
        this.locked = true;
        this.$.startView.open = false;
        setTimeout(() => this.notifyPath("collection"), 500);
    }

    save() {
        this.collection.save(this.localSource);
    }
}

window.customElements.define(App.is, App);

})();
