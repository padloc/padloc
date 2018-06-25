import { MutableData } from "@polymer/polymer/lib/mixins/mutable-data";
import { localize as $l } from "@padlock/core/lib/locale.js";
import { Record } from "@padlock/core/lib/data.js";
import { App } from "@padlock/core/lib/app.js";
import { setProvider } from "@padlock/core/lib/crypto.js";
import WebCryptoProvider from "@padlock/core/lib/webcrypto-provider.js";
// import { getDesktopSettings } from "@padlock/core/lib/platform.js";
import { debounce } from "@padlock/core/lib/util.js";

setProvider(WebCryptoProvider);
export const app = (window.app = new App());

// const desktopSettings = getDesktopSettings();
// const dbPath = desktopSettings ? desktopSettings.get("dbPath") : "data.pls";
// const localSource = new EncryptedSource(new FileSource(dbPath));
const dispatcher = document.createElement("div");

const debouncedSave = debounce(() => app.save(), 500);

dispatcher.addEventListener("record-changed", ({ detail }) => {
    const record = detail;
    record.updated = new Date();
    debouncedSave();
});

dispatcher.addEventListener("settings-changed", () => {
    if (app.settings.loaded) {
        debouncedSave();
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
                currentStore: {
                    type: Object,
                    value: app.mainStore,
                    notify: true
                },
                filterString: {
                    type: String,
                    value: ""
                },
                records: {
                    type: Array,
                    notify: true,
                    computed: "_filterAndSort(currentStore.records, filterString)"
                },
                settings: {
                    type: Object,
                    value: app.settings,
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
            return app.password;
        }

        get localSource() {
            throw "Get local source is not supported";
            // return localSource;
        }

        listen(name, fn) {
            dispatcher.addEventListener(name, fn);
        }

        dispatch(name, detail) {
            dispatcher.dispatchEvent(new CustomEvent(name, { detail: detail }));
        }

        dataReady() {
            return app.loaded;
        }

        hasData() {
            return app.isInitialized();
        }

        async initData(password) {
            await app.init(password);
            await this.setPassword(password);
            this.dispatch("data-initialized");
        }

        async loadData(password) {
            await app.unlock(password);
            this.dispatch("data-loaded");
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
            record.updated = new Date();
            this.saveCollection();
            this.dispatch("record-deleted", record);
        }

        deleteRecords(records) {
            records.forEach(r => r.remove());
            this.saveCollection();
            this.dispatch("records-changed");
        }

        addRecords(records) {
            this.currentStore.addRecords(records);
            this.saveCollection();
            this.dispatch("records-changed", records);
        }

        saveCollection() {
            debouncedSave();
        }

        async resetData() {
            await app.reset();
            this.dispatch("data-reset");
        }

        checkPassword(password) {
            return password === app.password;
        }

        setPassword(password) {
            return app.setPassword(password);
        }

        async unloadData() {
            await app.lock();
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
            this.notifyPath("currentStore");
            this.saveCall("dataLoaded");
        }

        _dataUnloaded() {
            this.saveCall("dataUnloaded");
            // Add short timeout before notifying of changes to give lock animation
            // TODO: Move this delay somewhere more appropriate (separation of concerns)
            setTimeout(() => {
                this.notifyPath("settings");
                this.notifyPath("currentStore");
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
            this.notifyPath("currentStore");
            this.saveCall("recordDeleted", e.detail);
        }

        _recordChanged(e) {
            this.notifyPath("currentStore");
            this.saveCall("recordChanged", e.detail);
        }

        _recordsChanged(e) {
            this.notifyPath("currentStore");
            this.saveCall("recordsChanged", e.detail);
        }

        _settingsChanged() {
            this.notifyPath("settings");
            this.saveCall("settingsChanged");
        }

        _filterAndSort() {
            if (!this.currentStore) {
                return [];
            }
            let records = this.currentStore.records.filter(r => !r.removed && filterByString(this.filterString, r));
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
    app
});
