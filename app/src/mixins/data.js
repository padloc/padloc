import { MutableData } from "@polymer/polymer/lib/mixins/mutable-data";
import { localize as $l } from "../core/locale.js";
import { Collection, Record, Settings } from "../core/data.js";
import { FileSource, EncryptedSource, LocalStorageSource } from "../core/source.js";
import { getDesktopSettings } from "../core/platform.js";
import { debounce } from "../core/util.js";

export const collection = new Collection();
export const settings = new Settings();

const desktopSettings = getDesktopSettings();
const dbPath = desktopSettings ? desktopSettings.get("dbPath") : "data.pls";
const localSource = new EncryptedSource(new FileSource(dbPath));
const settingsSource = new EncryptedSource(new FileSource("settings.pls"));
const dispatcher = document.createElement("div");

// transfer legacy data from LocalStorageSource to FileSource
async function transferData(lsName, fileName) {
    const lsSource = new LocalStorageSource(lsName);
    const fileSource = new FileSource(fileName);
    const data = await Promise.all([lsSource.get(), fileSource.get()]);
    // Only transfer if there is existing localstorage data but no
    // existing data in file storage
    if (data[0] && !data[1]) {
        await Promise.all([fileSource.set(data[0]), lsSource.clear()]);
        return true;
    } else {
        return false;
    }
}

const legacyDataTransfered = Promise.all([
    transferData("coll_default", dbPath),
    transferData("settings_encrypted", "settings.pls")
]);
const debouncedSaveSettings = debounce(() => settings.save(settingsSource), 500);
const debouncedSaveCollection = debounce(() => collection.save(localSource), 500);

dispatcher.addEventListener("record-changed", ({ detail }) => {
    const record = detail;
    record.updated = new Date();
    debouncedSaveCollection();
});

dispatcher.addEventListener("settings-changed", () => {
    if (settings.loaded) {
        debouncedSaveSettings();
    }
});

function filterByString(fs, rec) {
    if (!fs) {
        return true;
    }
    const words = fs.toLowerCase().split(" ");
    const content = rec.tags
        .concat([rec.name])
        .join(" ")
        .toLowerCase();
    return words.some(word => content.search(word) !== -1);
}

export function DataMixin(superClass) {
    return class DataMixin extends MutableData(superClass) {
        static get properties() {
            return {
                collection: {
                    type: Object,
                    value: collection,
                    notify: true
                },
                filterString: {
                    type: String,
                    value: ""
                },
                records: {
                    type: Array,
                    notify: true,
                    computed: "_filterAndSort(collection.records, filterString)"
                },
                settings: {
                    type: Object,
                    value: settings,
                    notify: true
                }
            };
        }

        constructor() {
            super();
            this.listen("record-created", e => this._recordCreated(e));
            this.listen("record-deleted", e => this._recordDeleted(e));
            this.listen("record-changed", e => this._recordChanged(e));
            this.listen("records-changed", e => this._recordsChanged(e));
            this.listen("data-initialized", () => this._dataInitialized());
            this.listen("data-loaded", () => this._dataLoaded());
            this.listen("data-unloaded", () => this._dataUnloaded());
            this.listen("data-reset", () => this._dataReset());
            this.listen("settings-changed", () => this._settingsChanged());
        }

        get password() {
            return localSource.password;
        }

        get localSource() {
            return localSource;
        }

        listen(name, fn) {
            dispatcher.addEventListener(name, fn);
        }

        dispatch(name, detail) {
            dispatcher.dispatchEvent(new CustomEvent(name, { detail: detail }));
        }

        dataReady() {
            return legacyDataTransfered;
        }

        hasData() {
            return localSource.hasData();
        }

        initData(password) {
            return this.setPassword(password).then(() => this.dispatch("data-initialized"));
        }

        loadData(password) {
            localSource.password = settingsSource.password = password;
            return Promise.all([
                collection.fetch(localSource),
                // We silently ignore failure to load settings since they don't contain any
                // critical data and should not prevent the app from loading if corrupted
                settings.fetch(settingsSource).catch()
            ]).then(() => this.dispatch("data-loaded"));
        }

        createRecord(name) {
            const fields = [
                { name: $l("Username"), value: "", masked: false },
                { name: $l("Password"), value: "", masked: true }
            ];
            const record = new Record(name || "", fields);
            this.addRecords([record]);
            this.dispatch("record-created", record);
            return record;
        }

        deleteRecord(record) {
            record.remove();
            this.saveCollection();
            this.dispatch("record-deleted", record);
        }

        deleteRecords(records) {
            records.forEach(r => r.remove());
            this.saveCollection();
            this.dispatch("records-changed");
        }

        addRecords(records) {
            this.collection.add(records);
            this.saveCollection();
            this.dispatch("records-changed", records);
        }

        saveCollection() {
            debouncedSaveCollection();
        }

        saveSettings() {
            if (settings.loaded) {
                settings.save(settingsSource);
            }
        }

        resetData() {
            localSource.clear();
            settingsSource.clear();
            collection.clear();
            settings.clear();
            localSource.password = settingsSource.password = "";
            this.dispatch("data-reset");
        }

        checkPassword(password) {
            return password === localSource.password;
        }

        setPassword(password) {
            localSource.password = settingsSource.password = password;
            return Promise.all([collection.save(localSource), settings.save(settingsSource)]);
        }

        unloadData() {
            collection.clear();
            settings.clear();
            localSource.password = settingsSource.password = "";
            this.dispatch("data-unloaded");
        }

        settingChanged() {
            this.dispatch("settings-changed");
        }

        saveCall(funcName, ...args) {
            const fn = this[funcName];
            if (typeof fn === "function") {
                return fn.apply(this, args);
            }
        }

        _dataInitialized() {
            this._dataLoaded();
            this.saveCall("dataInitialized");
        }

        _dataLoaded() {
            this.notifyPath("settings");
            this.notifyPath("collection");
            this.saveCall("dataLoaded");
        }

        _dataUnloaded() {
            this.saveCall("dataUnloaded");
            // Add short timeout before notifying of changes to give lock animation
            // TODO: Move this delay somewhere more appropriate (separation of concerns)
            setTimeout(() => {
                this.notifyPath("settings");
                this.notifyPath("collection");
            }, 500);
        }

        _dataReset() {
            this._dataUnloaded();
            this.saveCall("dataReset");
        }

        _recordCreated(e) {
            this.saveCall("recordCreated", e.detail);
        }

        _recordDeleted(e) {
            this.notifyPath("collection");
            this.saveCall("recordDeleted", e.detail);
        }

        _recordChanged(e) {
            this.notifyPath("collection");
            this.saveCall("recordChanged", e.detail);
        }

        _recordsChanged(e) {
            this.notifyPath("collection");
            this.saveCall("recordsChanged", e.detail);
        }

        _settingsChanged() {
            this.notifyPath("settings");
            this.saveCall("settingsChanged");
        }

        _filterAndSort() {
            let records = this.collection.records.filter(r => !r.removed && filterByString(this.filterString, r));
            this._recentCount = records.length > 10 ? 3 : 0;
            const recent = records
                .sort((a, b) => {
                    return (b.lastUsed || b.updated).getTime() - (a.lastUsed || a.updated).getTime();
                })
                .slice(0, this._recentCount);
            records = records.slice(this._recentCount);
            return recent.concat(records.sort((a, b) => Record.compare(a, b)));
        }
    };
}

Object.assign(DataMixin, {
    collection,
    settings
});
