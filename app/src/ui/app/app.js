(() => {

const { NotificationMixin, DialogMixin, AnnouncementsMixin, DataMixin, SyncMixin, BaseElement } = padlock;

class App extends AnnouncementsMixin(NotificationMixin(DialogMixin(SyncMixin(DataMixin(BaseElement))))) {

    static get is() { return "pl-app"; }

    static get properties() { return {
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
        "_autoLockChanged(settings.autoLock, settings.autoLockDelay, locked)"
    ]; }

    constructor() {
        super();

        this._debouncedSynchronize = padlock.util.debounce(() => this.synchronize(), 1000);

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

    recordChanged() {
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
    }

    recordDeleted(record) {
        if (record === this._selectedRecord) {
            this.$.listView.deselect();
        }
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
    }

    dataInitialized() {
        if (this.settings.syncEmail) {
            this.confirm($l("Would you like to pair this device with Padlock Cloud now?"), $l("Yes"), $l("Maybe Later"))
                .then((confirm) => {
                    if (confirm) {
                        this._currentView = "cloudView";
                        this.connectCloud(this.settings.syncEmail);
                    }
                });
        }
    }

    dataLoaded() {
        this.locked = false;
        this.$.startView.open = true;
        if (this.settings.syncAuto && this.settings.syncConnected) {
            this._debouncedSynchronize();
        }
        this.checkAnnouncements();
    }

    dataUnloaded() {
        this.$.startView.reset();
        this.locked = true;
        this.$.startView.open = false;
    }

    dataReset() {
        setTimeout(() => this.alert($l("App reset successfully. Off to a fresh start!")), 500);
    }

    _closeRecord() {
        this.$.listView.deselect();
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

    _openSettings() {
        this._currentView = "settingsView";
        this.$.listView.deselect();
    }

    _settingsBack() {
        this._currentView = "placeholderView";
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
                this.unloadData();
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
            shortcut = () => this.createRecord();
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

    _lockedChanged() {
        this.$.main.classList.toggle("active", !this.locked);
        this._autoLockChanged();
    }
}

window.customElements.define(App.is, App);

})();
